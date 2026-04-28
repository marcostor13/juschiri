require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const xlsx = require('xlsx');
const connectDB = require('../src/db');
const Product = require('../src/models/Product');

async function applyDiscounts() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const workbook = xlsx.readFile('c:\\\\Marcos\\\\Proyectos\\\\juschiri\\\\juschiri\\\\DESCUENTOS JUSCHIRI (1).xlsx');
    const sheet_name_list = workbook.SheetNames;
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
    
    // The first row seems to be the headers '10% DSCTO.', '15% DSCTO', ... mapped to 'CODIGO'
    // So data starts from index 1.
    const discountKeys = [
      { key: '10% DSCTO.', value: 10 },
      { key: '15% DSCTO', value: 15 },
      { key: '20% DSCTO.', value: 20 },
      { key: '30% DSCTO.', value: 30 },
      { key: '40% DSCTO.', value: 40 },
      { key: '50% DSCTO.', value: 50 },
    ];

    let updatedCount = 0;
    let notFoundCount = 0;

    // Start from index 1 because index 0 is { "10% DSCTO.": "CODIGO", ... }
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      for (const discountObj of discountKeys) {
        const codigo = row[discountObj.key];
        
        if (codigo) {
          // ensure codigo is string
          const codigoStr = String(codigo).trim();
          if (codigoStr === '' || codigoStr.toUpperCase() === 'CODIGO') continue;

          // Find the product and update discount
          const product = await Product.findOneAndUpdate(
            { codigo: codigoStr },
            { $set: { descuento: discountObj.value } },
            { new: true }
          );

          if (product) {
            console.log(`Updated product ${codigoStr} with ${discountObj.value}% discount`);
            updatedCount++;
          } else {
            console.log(`Product ${codigoStr} not found`);
            notFoundCount++;
          }
        }
      }
    }

    console.log(`Finished updating discounts.`);
    console.log(`Updated products: ${updatedCount}`);
    console.log(`Products not found: ${notFoundCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error applying discounts:', error);
    process.exit(1);
  }
}

applyDiscounts();
