const Order = require("../models/orderModel");
const Table = require("../models/tableModel");
const User = require("../models/userModel");
const Food = require("../models/foodModel");

const createOrder = async (req, res) => {
  try {
    const { userId, tableNo, items } = req.body;

    // Validate user and table
    const user = await User.findById(userId);
    const table = await Table.findOne({ tableNo });

    if (!user || !table) {
      return res.status(404).json({ message: "User or Table not found" });
    }

    // Initialize total amount
    let total = 0;
    const orderItems = [];

    // Loop through items to calculate total amount and prepare order items
    for (const itemId of Object.keys(items)) {
      const food = await Food.findById(itemId);
      if (!food) {
        return res
          .status(404)
          .json({ message: `Food item not found for ID: ${itemId}` });
      }

      const quantity = items[itemId]; // Quantity of the current item
      total += food.price * quantity;

      // Add item to orderItems array
      orderItems.push({
        food: itemId,
        quantity,
        status: "Pending", // Default status
      });
    }
    // Calculate GST and total amount
    let totalAmount;
    let GST;
    if (total >= 500) {
      GST = (total * 18) / 100;
      totalAmount = total + GST; // Add GST to the total
    } else {
      GST = 0;
      totalAmount = total; // No GST, totalAmount is just the total
    }

    // Create new order
    const order = new Order({
      user: userId,
      table: table._id,
      items: orderItems,
      total,
      GST,
      totalAmount,
    });

    const savedOrder = await order.save();

    // Update table and user
    table.currentOrders.push(savedOrder._id);
    await table.save();

    user.orders.push(savedOrder._id);
    user.cart = {}; // Clear user cart
    await user.save();

    return res
      .status(201)
      .json({ message: "Order created successfully", order: savedOrder });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const getOrdersByDate = async (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

  

     // Fetch food details for each item in all orders
     const ordersWithFood = await Promise.all(
      orders.map(async (order) => {
        const itemsWithFood = await Promise.all(
          order.items.map(async (item) => {
            const foodDetails = await Food.findById(item.food);
            return { ...item.toObject(), foodDetails }; // Include item details with food
          })
        );

        const [user, table] = await Promise.all([
          User.findById(order.user),
          Table.findById(order.table),
        ]);

        return { order, user, table, items: itemsWithFood };
      })
    );

    return res.status(200).json({ success: true, ordersData: ordersWithFood });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};




const cancelOrder = async (req, res) => {
  try {
    const { orderId, itemId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const itemIndex = order.items.findIndex(
      (item) => item.food.toString() === itemId
    );

    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in the order" });
    }

    order.items[itemIndex].status = "Cancelled";

    await order.save();
    return res
      .status(200)
      .json({ success: true, message: "Item cancelled successfully", order });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports = { createOrder,getOrdersByDate, cancelOrder };
