const User = require("../models/userModel");
const Table = require("../models/tableModel");
const Order = require("../models/orderModel");
const Food = require("../models/foodModel");
const cancelOrderModel = require("../models/cancelOrderModel");

// create new table
const createTable = async (req, res) => {
  try {
    const { tableNo } = req.body;

    if (!tableNo) {
      return res
        .status(400)
        .json({ success: false, message: "Enter table number" });
    }

    const existingTable = await Table.findOne({ tableNo });

    if (existingTable) {
      return res
        .status(400)
        .json({ success: false, message: "Table already existed" });
    }

    const table = new Table({ tableNo });
    await table.save();
    return res
      .status(201)
      .json({ success: true, message: "Table created successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// get table data
const tables = async (req, res) => {
  try {
    const tables = await Table.find({});
    return res.status(200).json({ success: true, data: tables });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// get table orders
const tableOrders = async (req, res) => {
  try {
    const { tableId } = req.body;
    const table = await Table.findById(tableId);

    if (!table) {
      return res.status(404).json({ success: false, message: "Table not found" });
    }

    const currentOrders = table.currentOrders;
    const tableOrders = [];

    let total = 0;
    let GST = 0;
    let totalAmount = 0;

    for (const orderId of currentOrders) {
      const order = await Order.findById(orderId);
     
      if (!order) continue; // Skip if order not found

      total += order.total; // Sum up all orders' total

      for (const orderItem of order.items) {
        const foodItem = await Food.findById(orderItem.food);
        tableOrders.push({ orderItem, foodItem, orderId });
      }
    }

    // GST Calculation
    GST = total >= 500 ? (total * 18) / 100 : 0;
    totalAmount = total + GST;

    // Update table's current bill
    table.currentTableBill = { total, GST, totalAmount };
    await table.save();

    return res.status(200).json({ success: true, tableOrders, tableBill: table.currentTableBill });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// update table order status
const updateTableOrderStatus = async (req, res) => {
  const { orderId, tableId, foodId, status } = req.body;
  try {
    if (!orderId || !tableId || !foodId || !status) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ success: false, message: "Table not found" });
    }

    let itemFound = false;
    let totalReduction = 0;

    for (const item of order.items) {
      if (item.food.toString() === foodId) {
        item.status = status;
        if (status === "Cancelled") {
          const foodData = await Food.findById(foodId);

          // Calculate amount to be deducted
          totalReduction = foodData.price * item.quantity;

          // Store canceled order details
          const user = await User.findById(order.user);
          const cancelOrderEntry = new cancelOrderModel({
            cancelOrderDetails: {
              orderId,
              ...foodData.toObject(),
              quantity: item.quantity,
            },
            userDetails: {
              userId: user._id,
              name: user.name,
              email: user.email,
            },
            tableDetails: {
              tableId: table._id,
              tableNo: table.tableNo,
            },
          });
          await cancelOrderEntry.save();
        }
        itemFound = true;
        break;
      }
    }

    if (!itemFound) {
      return res.status(404).json({ success: false, message: "Food item not found in the order" });
    }

    // Update Order totals
    order.total -= totalReduction;
    order.GST = order.total >= 500 ? (order.total * 18) / 100 : 0;
    order.totalAmount = order.total + order.GST;
    await order.save();

    // Update Table totals
    table.currentTableBill.total -= totalReduction;
    table.currentTableBill.GST = table.currentTableBill.total >= 500 ? (table.currentTableBill.total * 18) / 100 : 0;
    table.currentTableBill.totalAmount = table.currentTableBill.total + table.currentTableBill.GST;
    await table.save();

    return res.status(200).json({ success: true, message: "Order status updated successfully", status });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// delete table
const deleteTable = async (req, res) => {
  try {
    await Table.findByIdAndDelete(req.body.tableId);
    return res
      .status(200)
      .json({ success: true, message: "Table deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error in deleting table" });
  }
};

const completedOrder = async (req, res) => {
  try {
    const { tableId } = req.body;
    const table = await Table.findById(tableId);
    if (!table) {
      return res
        .status(404)
        .json({ success: false, message: "Table not found" });
    }

    const currentOrders = {
      order: table.currentOrders,
      tableBill: table.currentTableBill,
    };
    table.pastOrders.push(currentOrders);
    table.currentOrders = [];
    await table.save();

    return res
      .status(200)
      .json({ success: true, message: "Order completed successfully!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTable,
  tables,
  deleteTable,
  tableOrders,
  updateTableOrderStatus,
  completedOrder,
};
