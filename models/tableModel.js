const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
  {
    tableNo: { type: Number, required: true, unique: true }, // Unique table number
    currentOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }], // Current active order for the table
    currentTableBill: {
      type: Object,
      default: { total: 0, GST: 0, totalAmout: 0, payment: false },
    },
    pastOrders: [{ type: Object }], // List of past orders for the table
    date: { type: Date, default: Date.now }, // Date when the table was last updated
  },
  { minimize: false, timestamps: true } // Automatically manage createdAt and updatedAt
);

module.exports = mongoose.model("Table", tableSchema);
