import mongoose from "mongoose";

// Define the schema for a single rate row within the Term Deposit
const termDepositRateRowSchema = new mongoose.Schema({
    tenor: {
        type: String,
        required: [true, "Please provide the tenor for the rate"],
        trim: true, // Remove whitespace from ends
    },
    aed: {
        type: Number,
        required: [true, "Please provide the AED rate"],
        min: [0, "AED rate cannot be negative"],
    },
    usd: {
        type: Number,
        required: [true, "Please provide the USD rate"],
        min: [0, "USD rate cannot be negative"],
    },
}, { _id: false }); // Do not create an _id for subdocuments

const termDepositSchema = new mongoose.Schema({
    effectiveDate: {
        type: Date, // Storing as a Date object
        required: [true, "Please provide an effective date"],
        unique: true, // Only one set of term deposit rates per day
        index: true, // For faster lookup by date
    },
    rates: {
        type: [termDepositRateRowSchema], // Array of objects matching termDepositRateRowSchema
        required: [true, "Please provide at least one term deposit rate"],
        validate: {
            validator: function(v) { // Using function for 'this' context if needed, otherwise arrow function is fine
                return v && v.length > 0;
            },
            message: 'Term deposits must include at least one rate entry.'
        }
    },
}, { timestamps: true });

// Check if the model already exists before defining it
const TermDeposit = mongoose.models.TermDeposit || mongoose.model("TermDeposit", termDepositSchema);

export default TermDeposit;