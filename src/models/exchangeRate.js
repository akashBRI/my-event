import mongoose from "mongoose";

const exchangeRateSchema = new mongoose.Schema({
    date: {
        type: Date, // Storing as a Date object
        required: [true, "Please provide an effective date"],
        unique: true, // Only one exchange rate per day
        index: true, // For faster lookup by date
    },
    inrSellingRate: {
        type: Number,
        required: [true, "Please provide the INR Selling Rate"],
        min: [0.0000000001, "INR Selling Rate must be a positive number"], // Ensure it's positive
    },
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

// Check if the model already exists before defining it to prevent OverwriteModelError
const ExchangeRate = mongoose.models.ExchangeRate || mongoose.model("ExchangeRate", exchangeRateSchema);

export default ExchangeRate;