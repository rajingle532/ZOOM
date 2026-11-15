import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 254,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: true,
        select: false
    }
});

const User = mongoose.model("User", userSchema);
export { User };
