import express from "express";
const app = express();
app.listen(5001, () => console.log("API running on 5001"));

app.get("/", (req, res) => res.json("Hey you, you got it to work"));
