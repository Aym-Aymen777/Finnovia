# Marketplace Node.js Server

A comprehensive marketplace server with voice-to-text capabilities, FastAPI integration, and complete product management system.

## Features

✅ **Voice-to-Text Conversion** - Convert audio files to text using OpenAI Whisper API  
✅ **FastAPI Integration** - Send and receive data from FastAPI endpoints  
✅ **MongoDB Storage** - Complete marketplace product schema with all relationships  
✅ **RESTful API** - Full CRUD operations for products and related entities  
✅ **Complete Product Schema** - Includes products, variants, pricing, reviews, inventory, etc.

## Database Schema

The server implements a comprehensive marketplace schema with the following entities:

- **Product** - Main product information
- **ProductVariant** - Product variants (size, color, etc.)
- **Category** - Hierarchical categories
- **Brand** - Brand/manufacturer information
- **Seller** - Marketplace vendors
- **Inventory** - Stock management
- **Media** - Product images and videos
- **Pricing** - Offers and pricing rules
- **Review** - Customer reviews and ratings
- **Attributes** - Custom product specifications
- **Tag** - Product labels and tags
- **Audit** - Change history tracking

## Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd marketplace-server
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB**
```bash
# Make sure MongoDB is running on your system
mongod
```

5. **Run the server**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### Voice to Text
```http
POST /api/voice-to-text
Content-Type: multipart/form-data

Body: audio file (field name: 'audio')
```

### Send Data to FastAPI
```http
POST /api/send-to-fastapi
Content-Type: application/json

Body: {
  "any": "data",
  "to": "send"
}
```

### Fetch from FastAPI and Store
```http
GET /api/fetch-and-store
```

### Product CRUD Operations

**Get all products**
```http
GET /api/products
```

**Get single product with details**
```http
GET /api/products/:id
```

**Create product**
```http
POST /api/products
Content-Type: application/json

Body: {
  "sku": "PROD-001",
  "name": "Sample Product",
  "slug": "sample-product",
  "description": "Product description",
  "status": "published"
}
```

**Update product**
```http
PUT /api/products/:id
Content-Type: application/json

Body: { "name": "Updated Name" }
```

**Delete product**
```http
DELETE /api/products/:id
```

### Health Check
```http
GET /health
```

## Usage Examples

### Voice to Text Example
```bash
curl -X POST http://localhost:3000/api/voice-to-text \
  -F "audio=@recording.mp3"
```

### Send Data to FastAPI Example
```bash
curl -X POST http://localhost:3000/api/send-to-fastapi \
  -H "Content-Type: application/json" \
  -d '{"product_id": "123", "action": "process"}'
```

### Create Product Example
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "PROD-001",
    "name": "Wireless Headphones",
    "slug": "wireless-headphones",
    "description": "High-quality wireless headphones",
    "short_description": "Premium audio experience",
    "status": "published",
    "is_active": true,
    "weight": 0.3,
    "dimensions": {
      "length": 20,
      "width": 15,
      "height": 8
    }
  }'
```

## Data Structure Example

When fetching from FastAPI, the expected data structure:

```json
{
  "product": {
    "sku": "PROD-001",
    "name": "Product Name",
    "slug": "product-name",
    "description": "Full description",
    "short_description": "Short summary",
    "status": "published",
    "is_active": true,
    "weight": 1.5,
    "dimensions": {
      "length": 30,
      "width": 20,
      "height": 10
    }
  },
  "brand": {
    "name": "Brand Name",
    "slug": "brand-name",
    "description": "Brand description"
  },
  "category": {
    "name": "Category Name",
    "slug": "category-name"
  },
  "seller": {
    "name": "Seller Name",
    "is_active": true
  },
  "variants": [
    {
      "sku": "VAR-001",
      "name": "Red / Large",
      "price": 99.99,
      "stock_quantity": 50,
      "attributes": {
        "color": "red",
        "size": "L"
      }
    }
  ],
  "media": [
    {
      "url": "https://example.com/image.jpg",
      "type": "image",
      "alt_text": "Product image",
      "position": 0
    }
  ],
  "attributes": [
    {
      "name": "Material",
      "value": "Cotton",
      "type": "string"
    }
  ]
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/marketplace |
| OPENAI_API_KEY | OpenAI API key for Whisper | Required for voice-to-text |
| FASTAPI_URL | FastAPI POST endpoint | http://localhost:8000/api/process |
| FASTAPI_GET_URL | FastAPI GET endpoint | http://localhost:8000/api/data |

## Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **multer** - File upload handling
- **axios** - HTTP client
- **form-data** - Form data for API requests
- **dotenv** - Environment variable management

## Error Handling

All endpoints include comprehensive error handling with descriptive error messages. Errors are returned in the following format:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## License

ISC