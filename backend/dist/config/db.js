"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDb = connectDb;
const mongoose_1 = __importDefault(require("mongoose"));
const MONGO_URI = process.env.MONGO_URI || "";
async function connectDb() {
    if (!MONGO_URI) {
        throw new Error("MONGO_URI not set");
    }
    await mongoose_1.default.connect(MONGO_URI);
    console.log("MongoDB connected");
}
