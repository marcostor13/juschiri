require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const xlsx = require('xlsx');
const connectDB = require('../src/db');
const Product = require('../src/models/Product');

async function applyDiscounts() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Reset all discounts first to start clean
    await Product.updateMany({}, { $set: { descuento: 0 } });
    console.log('Resetted all discounts to 0.');

    const workbook = xlsx.readFile('c:\\\\Marcos\\\\Proyectos\\\\juschiri\\\\juschiri\\\\DESCUENTOS JUSCHIRI (1).xlsx');
    const sheet_name_list = workbook.SheetNames;
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
    
    // Headers: '10% DSCTO.', '15% DSCTO', ...
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

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      for (const discountObj of discountKeys) {
        const rawCodigo = row[discountObj.key];
        
        if (rawCodigo) {
          const rawStr = String(rawCodigo).trim();
          if (rawStr === '' || rawStr.toUpperCase() === 'CODIGO') continue;

          // regex to match any amount of leading zeros
          const regexStr = '^0*' + rawStr.replace('.', '\\.') + '$';
          const regex = new RegExp(regexStr, 'i');

          const product = await Product.findOneAndUpdate(
            { codigo: regex },
            { $set: { descuento: discountObj.value } },
            { new: true }
          );

          if (product) {
            updatedCount++;
          } else {
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
