import pandas as pd
import json
import math

def process_excel():
    file_name = 'Base de Datos SUG.xlsx'
    # Leer la hoja de Excel
    try:
        xl = pd.ExcelFile(file_name)
        # Asumiendo que la data esta en la primera hoja '2025' o la primera disponible
        df = xl.parse(xl.sheet_names[0])
        
        # Filtrar o limpiar nombres de columnas
        df.columns = df.columns.str.strip()
        
        # Eliminar filas completamente nulas o sin folio (suponiendo que 'Folio Interno' sea necesario)
        # df = df.dropna(subset=['Folio Interno']) # Podriamos perder datos, mejor mantener lo mayor posible
        
        # Convertir NaNs a null para JSON
        df = df.where(pd.notnull(df), None)

        records = df.to_dict(orient='records')
        
        # Limpiar posibles floats nulos e infinity
        clean_records = []
        for r in records:
            clean_r = {}
            for k, v in r.items():
                if isinstance(v, float) and math.isnan(v):
                    clean_r[k] = None
                elif isinstance(v, pd.Timestamp):
                    clean_r[k] = v.strftime('%Y-%m-%d')
                else:
                    clean_r[k] = v
            clean_records.append(clean_r)
            
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(clean_records, f, ensure_ascii=False, indent=2, default=str)
            
        print("Data processed successfully. Exported to data.json.")
        
    except Exception as e:
        print("Error processing Excel:", e)

if __name__ == '__main__':
    process_excel()
