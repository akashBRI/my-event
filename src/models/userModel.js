import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Please provide a email"],
        unique: true,
    },
    password: {
        type: String,
        required: [true, "Please provide a password"],
    },
    isVerfied: {
        type: Boolean,
        default: false,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    // --- NEW ROLE FIELD ---
    role: {
        type: String,
        enum: ['admin', 'role1', 'role2', 'role3'], // Define allowed roles
        default: 'role1', // Set a default role for new users
        required: true, // You might want to make role required if no default is provided
    },
    // --- END NEW ROLE FIELD ---
    forgotPasswordToken: String,
    forgotPasswordTokenExpiry: Date,
    verifyToken: String,
    verifyTokenExpiry: Date,
});

const User = mongoose.models.users || mongoose.model("users", userSchema);

export default User;