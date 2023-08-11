import mongoose from "mongoose";

export default new mongoose.Schema({
  name   : String,
  type   : String,
  desc   : String,
  abbrev : String,
  author : String,
  icon   : String
});