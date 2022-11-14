import express from 'express';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import Joi from 'joi';
import dayjs from 'dayjs';

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

const db = client.db("UOL");

app.post("/participants", (req, res) => {
    const { name } = req.body;
    const validation = Joi.string().required();

    let validateName = validation.validate(name);

    if(validateName.error) {
        res.sendStatus(422);
        return;
    } else {
        db.collection("participants").find({name}).toArray().then((n) => {
            if(n.length > 0) {
                res.sendStatus(409);
                return;
            } else {
                db.collection("participants").insertOne({name, lastStatus: Date.now()});
                db.collection("messages").insertOne({
                    from: name, 
                    to: 'Todos', 
                    text: 'entra na sala...', 
                    type: 'status', 
                    time: dayjs().format("HH:mm:ss")
                });

                res.sendStatus(201);
            }
        });
    }    
});

app.get("/participants", async (req, res) => {
    const participants = await db.collection("participants").find({}).toArray();

    res.send(participants);
});

app.post("/messages", (req, res) => {
    const {to, text, type} = req.body;
    const user = req.headers.user;

    const validation = Joi.object({
        to: Joi.string().required(),
        text: Joi.string().required()
    });

    let validateMessage = validation.validate({to, text});
    
    if(validateMessage.error || (type != "message" && type != "private_message")) {
        console.log(validateMessage.error.details);
        res.sendStatus(422);
        return;
    } else {
        db.collection("participants").find({name: user}).toArray().then((u) => {
            if(u.length > 0) {
                db.collection("messages").insertOne({
                    from: user, 
                    to: to, 
                    text: text, 
                    type: type, 
                    time: dayjs().format("HH:mm:ss")
                });

                res.sendStatus(201);
            } else {
                res.sendStatus(404);   
            }
        });
    }
});

app.get("/messages", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;
    const user = req.headers.user;

    let filteredMessages;

    await db.collection("messages").find({}).limit(limit).toArray().then((msgs) => {
        filteredMessages = [];
        msgs.forEach((msg) => {
            if(user === msg.to || msg.to === "Todos") {
                filteredMessages.push(msg);
            }
        });
    });    

    res.send(filteredMessages);
});

app.post("/status", async (req, res) => {
    const user = req.headers.user;

    await db.collection("participants").find({name: user}).toArray().then((usr) => {
        if(usr.length > 0) {
            db.collection("participants").updateOne(
                {lastStatus: usr[0].lastStatus},
                {$set: {lastStatus: Date.now()}},
                {upsert: true}
            );

            res.sendStatus(200);            
        } else {
            res.sendStatus(404);
        }
    });
});

setInterval(() => {
    db.collection("participants").find({}).toArray().then((users) => {
        users.forEach((user) => {            
            if(Date.now() - user.lastStatus > 10000) {
                db.collection("participants").deleteOne(user);
            }
        });
    });
}, 15000);

app.listen(process.env.PORT, () => console.log(`Server running in port ${process.env.PORT}`));