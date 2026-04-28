import pandas as pd
import json
import logging
import time
import random
import sys
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

# Importamos todo desde el migrate original para no duplicar funciones complejas
from migrate import (
    process_product,
    load_checkpoint,
    save_checkpoint,
    OUTPUT_DIR,
    OUTPUT_JSON,
    OUTPUT_LOG,
    CHECKPOINT_FILE,
    DELAY_MIN,
    DELAY_MAX,
    log
)

import requests

API_URL = os.environ.get("API_URL", "http://localhost:3000/api")

def read_excel_products(file_path):
    df = pd.read_excel(file_path)
    products = []
    
    for idx, row in df.iterrows():
        codigo = str(row.get('Código', row.get('Codigo', ''))).strip()
        if not codigo or codigo == 'nan':
            continue
            
        nombre = str(row.get('Nombre', '')).strip()
        if not nombre or nombre == 'nan':
            continue
            
        marca = str(row.get('Marca', '')).strip()
        if marca == 'nan': marca = ''
        
        categoria_excel = str(row.get('Categorias', '')).strip()
        if categoria_excel == 'nan': categoria_excel = ''
        
        precio = row.get('PRECIO', 0)
        try:
            precio = float(precio)
        except:
            precio = 0
            
        stock = row.get('STOCK TANDIA', row.get('STOCK ACTUAL', 1))
        try:
            stock = int(stock)
        except:
            stock = 1
            
        if pd.isna(precio): precio = 0
        if pd.isna(stock): stock = 1
            
        # Mapeamos a nuestro formato Mongoose base
        products.append({
            "codigo": codigo,
            "nombre": nombre,
            "marca": marca,
            "categoria": "Zapatillas",       # Requerimiento: Categoría principal = Zapatillas
            "subcategoria": categoria_excel, # Requerimiento: Subcategoría = Columna 'Categorias'
            "precio": precio,
            "stock_actual": stock,
            "stock_anterior": 0,
            "imagen_url": None
        })
        
    return products

def push_to_api(product, token=None):
    # Endpoint upsert (si lo hay) o hacemos un PUT y si falla un POST.
    pass

def main():
    file_path = Path(__file__).resolve().parents[2] / 'TRABAJO INVENTARIO IVAN - zapatillas.xlsx'
    
    if not file_path.exists():
        log.error(f"El archivo Excel {file_path} no existe.")
        return
        
    log.info(f"Leyendo productos de {file_path}")
    products = read_excel_products(file_path)
    log.info(f"Se encontraron {len(products)} productos válidos en el Excel.")
    
    checkpoint = load_checkpoint()
    
    # Marcamos en el checkpoint los que ya tienen imagen_url válido
    processed_count = sum(1 for cp in checkpoint.values() if cp.get("imagen_url"))
    log.info(f"Checkpoint tiene {processed_count} productos ya procesados con imagen.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        
        for i, prod in enumerate(products):
            codigo = prod["codigo"]
            
            # Revisar si ya fue procesado y tiene imagen
            if codigo in checkpoint and checkpoint[codigo].get("imagen_url"):
                prod["imagen_url"] = checkpoint[codigo]["imagen_url"]
                # log.info(f"[{i+1}/{len(products)}] {codigo} | Saltado (ya tiene imagen en checkpoint).")
                continue
                
            log.info(f"[{i+1}/{len(products)}] {codigo} | Buscando: {prod['nombre']} ({prod['marca']})")
            
            # Process product (descarga de Bing -> sube a S3 -> actualiza prod)
            updated_prod = process_product(prod.copy(), page)
            
            # Guardar en el dict para export
            prod["imagen_url"] = updated_prod.get("imagen_url")
            
            checkpoint[codigo] = prod
            save_checkpoint(checkpoint)
            
            # Pausa para no saturar Bing
            if not updated_prod.get("imagen_url"):
                time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
            else:
                time.sleep(random.uniform(1.0, 3.0))

        browser.close()
        
    # Guardar JSON final
    log.info("Generando output_zapatillas.json")
    out_file = OUTPUT_DIR / "zapatillas_ready.json"
    
    # Agrupar los resultados
    final_list = []
    for prod in products:
        cp = checkpoint.get(prod["codigo"])
        if cp:
            final_list.append(cp)
        else:
            final_list.append(prod)
            
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)
        
    log.info(f"Proceso completado. Datos guardados en {out_file}")

if __name__ == "__main__":
    main()
