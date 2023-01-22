import { MongoClient } from "mongodb";
import cors from "cors";
// const express = require("express"); // "type": "commonjs"
import express, { response } from "express"; // "type": "module"
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { nanoid } from "nanoid";
import Razorpay from "Razorpay";
import axios from 'axios'

import { createHmac } from "crypto";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL;

//environment variables

//connect mongodb

async function MongoConnect() {
  const client = await new MongoClient(MONGO_URL).connect();
  console.log("Mongo Connected");
  return client;
}

const client = await MongoConnect();

app.get("/", function (request, response) {
  response.send("🙋‍♂️ Welcome to eCommerce Backend");
});

app.listen(PORT, () => console.log(`The server started in: ${PORT} ✨✨`));

//hashing password

//sign in sign up services

async function hashedPassword(password) {
  const NO_OF_ROUNDS = 10;
  const salt = await bcrypt.genSalt(NO_OF_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

app.post("/signup", async function (request, response) {
  let { name, email, password } = request.body;
  let userdb = await client
    .db("HelpDesk")
    .collection("Users")
    .findOne({ email: email });
  if (userdb) {
    response.status(200).send({ msg: "user already present", userdb });
  } else {
    const hashedPass = await hashedPassword(password);
    let result = await client.db("HelpDesk").collection("Users").insertOne({
      name,
      email: email,
      password: hashedPass,
      admin: false,
      doj: newdate,
    });
    response.send({ msg: "user added", name, email, result });
  }
});

app.post("/signin", async function (request, response) {
  let { email, password } = request.body;
  let userdb = await client
    .db("HelpDesk")
    .collection("Users")
    .findOne({ email: email });

  if (userdb) {
    const isSame = await bcrypt.compare(password, userdb.password);

    if (isSame) {
      console.log(userdb);
      var name = userdb.name;
      var admin = userdb.admin;
      var token = jwt.sign({ email: email }, process.env.JWT_SECRET);
      response.status(200).send({ msg: "logged in", token, name, admin });
    } else {
      response.status(200).send({ msg: "invalid credentials" });
    }
  } else {
    response.status(200).send({ msg: "no user found" });
  }
});

// payment

app.post("/orders/:amount", async (req, res) => {
  const amount = req.params.amount;
  const receipt = nanoid(4);
  try {
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: receipt,
    };

    const order = await instance.orders.create(options);

    if (!order) {
      return res.status(200).send({ msg: "Something went wrong" });
    }

    res.status(200).send(order);
  } catch (error) {
    console.log("entered error block");
    res.status(200).send({ error, msg: "entered error block" });
  }
});

app.post("/success", async (req, res) => {
  try {
    // getting the details back from our font-end
    const {
      orderCreationId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = req.body;

    // Creating our own digest
    // The format should be like this:
    // digest = hmac_sha256(orderCreationId + "|" + razorpayPaymentId, secret);
    const algo = "sha256";
    const secret = process.env.RAZORPAY_SECRET;

    // Create an HMAC instance
    const hmac = createHmac(algo, secret);

    // Update the internal state of
    // the hmac object
    hmac.update(`${orderCreationId}|${razorpayPaymentId}`);

    // Perform the final operations
    // No encoding provided
    // Return calculated hmac hash
    // value as Buffer
    let result = hmac.digest();
    result = result.toString("hex");

    // comaparing our digest with the actual signature
    if (result !== razorpaySignature) {
      console.log("signature varification failed");
      return res.status(400).json({ msg: "Transaction not legit!" });
    } else {
      res.status(200).send({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
      });
    }

    // THE PAYMENT IS LEGIT & VERIFIED
    // YOU CAN SAVE THE DETAILS IN YOUR DATABASE IF YOU WANT
  } catch (error) {
    console.log("entered error bloc of success");
    res.status(404).send(error);
  }
});

// get users from fake store api


//sign jwt

// var token = jwt.sign({ email: email }, process.env.JWT_SECRET);

// //compare with bcrypt

//         const isSame = await bcrypt.compare(password,userdb.password);

// //jwt middleware

// import jwt from 'jsonwebtoken'

// export const auth = (request,response, next)=>{
//     const token = request.header("x-auth-token");
//     console.log("token", token)
//     jwt.verify(token,process.env.JWT_SECRET)
//     next();
// }
