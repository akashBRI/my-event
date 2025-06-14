import mongoose from "mongoose";

const homeLoanSchema = new mongoose.Schema({
    effectiveDate: {
        type: Date, // Storing as a Date object
        required: [true, "Please provide an effective date"],
        unique: true, // Only one home loan rate entry per day
        index: true, // For faster lookup by date
    },
    fullyVariableRate: {
        type: Number,
        required: [true, "Please provide the fully variable rate"],
        min: [0.001, "Fully Variable Rate must be a positive number"],
    },
    eiborMonths: {
        type: Number,
        required: [true, "Please provide EIBOR months"],
        min: [0, "EIBOR Months cannot be negative"],
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer value for EIBOR Months'
        },
    },
    minimumHomeLoanRate: {
        type: Number,
        required: [true, "Please provide the minimum home loan rate"],
        min: [0.001, "Minimum Home Loan Rate must be a positive number"],
    },
}, { timestamps: true });

// Check if the model already exists before defining it
const HomeLoan = mongoose.models.HomeLoan || mongoose.model("HomeLoan", homeLoanSchema);

export default HomeLoan;