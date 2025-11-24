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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✓ MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

// ==================== MONGOOSE SCHEMAS ====================

// Brand Schema
const brandSchema = new mongoose.Schema({
  name: { type: String, },
  slug: { type: String,  unique: true },
  logo_url: String,
  description: String,
}, { timestamps: true });

// Category Schema (with hierarchical support)
const categorySchema = new mongoose.Schema({
  name: { type: String, },
  slug: { type: String,  unique: true },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

// Seller Schema
const sellerSchema = new mongoose.Schema({
  name: { type: String, },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating: { type: Number, default: 0 },
  join_date: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// Product Variant Schema
const productVariantSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', },
  sku: { type: String,  unique: true },
  name: String,
  price: { type: Number, },
  compare_price: Number,
  stock_quantity: { type: Number, default: 0 },
  barcode: String,
  attributes: mongoose.Schema.Types.Mixed,
  is_default: { type: Boolean, default: false },
}, { timestamps: true });

// Media Schema
const mediaSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', },
  variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
  url: { type: String, },
  type: { type: String, enum: ['image', 'video'], default: 'image' },
  alt_text: String,
  position: { type: Number, default: 0 },
}, { timestamps: true });

// Pricing/Offer Schema
const pricingSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', },
  variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
  price: { type: Number, },
  currency: { type: String, default: 'DZD' },
  offer_type: { type: String, enum: ['fixed', 'auction', 'discount'], default: 'fixed' },
  start_date: Date,
  end_date: Date,
  min_quantity: { type: Number, default: 1 },
  max_quantity: Number,
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// Review Schema
const reviewSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', },
  rating: { type: Number,  min: 1, max: 5 },
  title: String,
  comment: String,
}, { timestamps: true });

// Attributes/Specifications Schema
const attributeSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', },
  name: { type: String, },
  value: mongoose.Schema.Types.Mixed,
  type: { type: String, enum: ['string', 'number', 'boolean'], default: 'string' },
}, { timestamps: true });

// Tag Schema
const tagSchema = new mongoose.Schema({
  name: { type: String,  unique: true },
}, { timestamps: true });

// Inventory Schema
const inventorySchema = new mongoose.Schema({
  variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  warehouse_location: String,
  quantity: { type: Number, default: 0 },
  reorder_threshold: { type: Number, default: 10 },
  is_backorder: { type: Boolean, default: false },
}, { timestamps: true });

// Audit/History Schema
const auditSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', },
  changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  change_type: { type: String, },
  old_value: mongoose.Schema.Types.Mixed,
  new_value: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
});

// Main Product Schema
const productSchema = new mongoose.Schema({
  sku: { type: String,  unique: true },
  name: { type: String, },
  slug: { type: String,  unique: true },
  description: String,
  short_description: String,
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  is_active: { type: Boolean, default: true },
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
  },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
}, { timestamps: true });

// Models
const Brand = mongoose.model('Brand', brandSchema);
const Category = mongoose.model('Category', categorySchema);
const Seller = mongoose.model('Seller', sellerSchema);
const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);
const Media = mongoose.model('Media', mediaSchema);
const Pricing = mongoose.model('Pricing', pricingSchema);
const Review = mongoose.model('Review', reviewSchema);
const Attribute = mongoose.model('Attribute', attributeSchema);
const Tag = mongoose.model('Tag', tagSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const Audit = mongoose.model('Audit', auditSchema);
const Product = mongoose.model('Product', productSchema);

// ==================== ENDPOINTS ====================


// 1. Send Data to FastAPI Endpoint
app.post('/api/send-to-fastapi', async (req, res) => {
  try {
    const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000/api/process';
    
    const response = await axios.post(FASTAPI_URL, req.body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = response.data;
     const savedProducts = Array.isArray(data)
      ? await Promise.all(data.map(item => saveProductData(item)))
      : [await saveProductData(data)];

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

async function saveProductData(data) {
  try {
    let brand, category, seller;

    if (data.brand) {
      brand = await Brand.findOneAndUpdate(
        { name: data.brand.name },
        data.brand,
        { upsert: true, new: true }
      );
    }

    if (data.category) {
      category = await Category.findOneAndUpdate(
        { name: data.category.name },
        data.category,
        { upsert: true, new: true }
      );
    }

    if (data.seller) {
      seller = await Seller.findOneAndUpdate(
        { name: data.seller.name },
        data.seller,
        { upsert: true, new: true }
      );
    }

    const productData = {
      ...data.product,
      brand_id: brand?._id,
      category_id: category?._id,
      seller_id: seller?._id,
    };

    const product = await Product.findOneAndUpdate(
      { sku: productData.sku },
      productData,
      { upsert: true, new: true }
    );

    // Save variants
    if (data.variants && Array.isArray(data.variants)) {
      for (const variantData of data.variants) {
        await ProductVariant.findOneAndUpdate(
          { sku: variantData.sku },
          { ...variantData, product_id: product._id },
          { upsert: true, new: true }
        );
      }
    }

    // Save media
    if (data.media && Array.isArray(data.media)) {
      for (const mediaData of data.media) {
        await Media.create({ ...mediaData, product_id: product._id });
      }
    }

    // Save attributes
    if (data.attributes && Array.isArray(data.attributes)) {
      for (const attrData of data.attributes) {
        await Attribute.create({ ...attrData, product_id: product._id });
      }
    }

    return product;
  } catch (error) {
    console.error('Error saving product data:', error);
    throw error;
  }
}

//2.store data manually
app.post('/api/products/manual', async (req, res) => {
  try {
    const data = req.body;
    const product = await saveProductData(data);
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