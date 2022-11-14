import express from 'express';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

const app = express();

app.use(express.json());
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

try {
    await client.connect();
    console.log("MongoDB conectado");
} catch (error) {
    console.log(error);
}

app.listen(process.env.PORT, () => console.log(`Server running in port ${process.env.PORT}`));