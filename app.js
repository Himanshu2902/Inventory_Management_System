// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser=require('body-parser');


// Create express app
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Serve static files from the public directory
app.use(express.static('public'));



//connect to url and create database mongodb://127.0.0.1:27017/MyshopkeeperDB
mongoose.connect('mongodb://127.0.0.1:27017/IcecreamDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

// Define item schema
const itemSchema = new mongoose.Schema({
    name: String,
    stock: Number,
    price: Number
});

// Create item model
const Item = mongoose.model('Item', itemSchema);


// Define order schema
const orderSchema = new mongoose.Schema({
  mobileNumber: String,
  items: [
      {
          name: String,
          qty: Number,
          price: Number
      }
  ]
});

// Create order model
const Order = mongoose.model('Order', orderSchema);

// Add middleware for handling JSON data
app.use(express.json());


app.get('/', (req, res) => {
    res.render('index');
});

// Add route for rendering add stock page
app.get('/addStock', (req, res) => {
    res.render('addStock');
});

// Add item to inventory
app.post('/addToInventory', async (req, res) => {
    const { name, stock, price } = req.body;
  
    try {
      let item = await Item.findOne({ name });
  
      if (item) {
        item.stock += parseInt(stock);
        item.price = parseInt(price);
      } else {
        item = new Item({ name, stock: parseInt(stock), price: parseInt(price) });
      }
  
      await item.save();
      console.log(item);
      res.redirect('/addStock');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error adding item to inventory Stock');
    }
  });

app.get('/viewInventory', async (req, res) => {
    try {
      const items = await Item.find({});
      res.render('viewInventory', { items });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error retrieving inventory');
    }
  });


app.post('/updateStock', async (req, res) => {
  const { itemName, itemQty } = req.body;
  var mobileNumber = req.body.mobileNumber;
  try {
    const items = [];
    let totalPrice = 0;

    for (let i = 0; i < itemName.length; i++) {
      let item = await Item.findOne({ name: itemName[i] });

      if (!item) {
        return res.status(404).send(`<h1>Item '${itemName[i]}' not found in inventory</h1>`);
      }

      const currentStock = item.stock;
      const requestedQty = parseInt(itemQty[i]);
      if (requestedQty > currentStock) {
        return res.status(400).send(`<h1>Requested quantity for '${itemName[i]}' is greater than available stock</h1>`);
      }

      const newStock = currentStock - requestedQty;

      item.stock = parseInt(newStock);
      await item.save();

      const price = item.price * requestedQty;
      totalPrice += price;

      items.push({
        name: item.name,
        qty: parseInt(requestedQty),
        price: price
      });
    }

    const order = new Order({
      mobileNumber: mobileNumber,
      items: items
    });

    await order.save();
    
      console.log(order);
      res.redirect('/currentOrder?mobileNumber=' + mobileNumber);
    }
  catch (error) {
    console.error(error);
    res.status(500).send('Error updating item stock');
  }
});


// Show current order details
app.get('/currentOrder', async (req, res) => {
  try {
    const mobileNumber = req.query.mobileNumber;
    const order = await Order.findOne({ mobileNumber: mobileNumber }).sort({ _id: -1 }).limit(1);

    if (!order) {
      return res.status(404).send(`No orders found for mobile number '${mobileNumber}'`);
    }

    const items = order.items;
    let totalQty = 0;
    let totalPrice = 0;

    for (let i = 0; i < items.length; i++) {
      totalQty += items[i].qty;
      totalPrice += items[i].price;
    }

    res.render('currentOrder', { order, totalQty, totalPrice,mobileNumber });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving current order details');
  }
});

app.get('/updates', async (req, res) => {
  try {
    const lowStockItems = await Item.find({ stock: { $lte: 20 } });
    res.render('updates', { lowStockItems });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving low stock items');
  }
});
app.get('/payment',(req,res)=>{
  res.render('payment');
});

app.get('/productSearch', function(req, res) {
  const itemName = req.query.itemName;
  Item.findOne({ name: itemName }, 'name stock', function(err, foundItem) {
    if (err) {
      console.log(err);
      res.status(500).send('Internal Server Error');
    } else if (foundItem) {
      const stock = foundItem.stock;
      res.render('productSearch', { itemName: itemName, stock: stock });
    } else {
      res.render('productSearch', { itemName: itemName, stock: 0 });
    }
  });
});



// Start server

const port = process.env.PORT || 80;
app.listen(port, () => console.log(`Listening on port ${port}...`));