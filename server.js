// server.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const upload = multer({ dest: 'uploads/' });

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace')
.then(() => console.log('✓ MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

// ==================== MONGOOSE SCHEMAS ====================

// Main Product Schema
const productSchema = new mongoose.Schema({
  item: String,
  price: Number,
  quantity: Number,
  unit: String,
}, { timestamps: true });

// Models

const Product = mongoose.model('Product', productSchema);

// ==================== ENDPOINTS ====================


// 1. Send Data to FastAPI Endpoint
app.post('/api/send-to-fastapi', upload.single('file'), async (req, res) => {
  try {
    const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000/api/process';

    const form = new FormData();
    // Append the file as a readable stream
    form.append('file', fs.createReadStream(req.file.path), req.file.originalname);

    const response = await axios.post(FASTAPI_URL, form, {
      headers: form.getHeaders(), // <- important!
    });

    const productsData = response.data.items;
    console.log(productsData)
    const savedProducts = [];
    for (const data of productsData) {
      const product = new Product(data);
      await product.save();
      savedProducts.push(product);
    }

    res.json({
      success: true,
      message: 'Data sent to FastAPI successfully',
      products: savedProducts,
    });
  } catch (error) {
    console.error('FastAPI send error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to send data to FastAPI',
      details: error.response?.data || error.message,
    });
  }
});

app.post('/api/send-to-fastapi-ocr', upload.single('file'), async (req, res) => {
  try {
    const FASTAPI_URL = process.env.FASTAPI_OCR_URL || 'http://localhost:8000/api/process';

    const form = new FormData();
    // Append the file as a readable stream
    form.append('file', fs.createReadStream(req.file.path), req.file.originalname);

    const response = await axios.post(FASTAPI_URL, form, {
      headers: form.getHeaders(), // <- important!
    });

    const productsData = response.data.items;
    if (!productsData || !productsData.length) {
      return res.status(400).json({ error: 'No products returned from FastAPI' });
    }

    // Bulk insert to MongoDB
    const savedProducts = await Product.insertMany(productsData);

    res.json({
      success: true,
      message: 'Data sent to FastAPI successfully',
      products: savedProducts,
    });
  } catch (error) {
    console.error('FastAPI send error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to send data to FastAPI',
      details: error.response?.data || error.message,
    });
  }
});

//2.store data manually
app.post('/api/products/manual', async (req, res) => {
  try {
    const data = req.body;
    const product = await Product.create(data);
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. CRUD Endpoints for Product Management

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find()
      .populate('brand_id')
      .populate('category_id')
      .populate('seller_id')
      .populate('tags');
    
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product with all related data
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('brand_id')
      .populate('category_id')
      .populate('seller_id')
      .populate('tags');
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const variants = await ProductVariant.find({ product_id: product._id });
    const media = await Media.find({ product_id: product._id });
    const attributes = await Attribute.find({ product_id: product._id });
    const reviews = await Review.find({ product_id: product._id });
    const pricing = await Pricing.find({ product_id: product._id });

    res.json({
      success: true,
      product,
      variants,
      media,
      attributes,
      reviews,
      pricing,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;