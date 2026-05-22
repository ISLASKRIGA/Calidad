import os
import json
import math
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io

def download_excel_from_drive(file_id, credentials_info):
    """Descarga el archivo Excel desde Google Drive usando credenciales de Cuenta de Servicio"""
    print(f"Descargando archivo {file_id} desde Google Drive...")
    
    # Autenticar
    creds = service_account.Credentials.from_service_account_info(
        credentials_info,
        scopes=['https://www.googleapis.com/auth/drive.readonly']
    )
    
    # Crear servicio de Drive
    service = build('drive', 'v3', credentials=creds)
    
    # Solicitar descarga del archivo
    request = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    
    done = False
    while not done:
        status, done = downloader.next_chunk()
        print(f"Progreso de descarga: {int(status.progress() * 100)}%")
        
    fh.seek(0)
    return fh

def process_excel():
    file_id = '1qntKWV5B2871JultSTKFqXiCwhTN4FmP'
    
    # Intentar obtener credenciales de la variable de entorno o de un archivo local 'credentials.json'
    credentials_json = os.environ.get('GOOGLE_CREDENTIALS')
    
    if credentials_json:
        print("Usando credenciales desde la variable de entorno GOOGLE_CREDENTIALS...")
        try:
            credentials_info = json.loads(credentials_json)
        except Exception as e:
            print("Error al decodificar la variable GOOGLE_CREDENTIALS:", e)
            credentials_info = None
    elif os.path.exists('credentials.json'):
        print("Usando archivo local credentials.json...")
        with open('credentials.json', 'r') as f:
            credentials_info = json.load(f)
    else:
        print("No se encontraron credenciales de Google. Se saltará la descarga y se procesará el Excel local si existe.")
        credentials_info = None

    # Si tenemos credenciales, descargamos la versión más reciente de Drive
    if credentials_info:
        try:
            excel_data = download_excel_from_drive(file_id, credentials_info)
            # Guardar una copia local de respaldo
            with open('Base de Datos SUG.xlsx', 'wb') as f:
                f.write(excel_data.getvalue())
            excel_data.seek(0)
        except Exception as e:
            print("Error al descargar de Google Drive:", e)
            print("Se intentará leer el archivo Excel local de respaldo...")
            excel_data = 'Base de Datos SUG.xlsx'
    else:
        excel_data = 'Base de Datos SUG.xlsx'

    # Leer la hoja de Excel
    try:
        xl = pd.ExcelFile(excel_data)
        df = xl.parse(xl.sheet_names[0])
        
        # Filtrar o limpiar nombres de columnas
        df.columns = df.columns.str.strip()
        df = df.where(pd.notnull(df), None)

        records = df.to_dict(orient='records')
        
        # Limpiar posibles floats nulos e infinity y normalizar cabeceras
        clean_records = []
        for r in records:
            clean_r = {}
            for k, v in r.items():
                # Limpiar saltos de línea de la cabecera
                clean_key = k.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ').replace('  ', ' ').strip()
                
                if isinstance(v, float) and math.isnan(v):
                    clean_r[clean_key] = None
                elif isinstance(v, pd.Timestamp):
                    clean_r[clean_key] = v.strftime('%Y-%m-%d')
                else:
                    clean_r[clean_key] = v
            clean_records.append(clean_r)
            
        # Exportar a la raíz
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(clean_records, f, ensure_ascii=False, indent=2, default=str)
            
        # Exportar a la carpeta del frontend
        frontend_dir = os.path.join('sug-dashboard', 'src')
        os.makedirs(frontend_dir, exist_ok=True)
        with open(os.path.join(frontend_dir, 'data.json'), 'w', encoding='utf-8') as f:
            json.dump(clean_records, f, ensure_ascii=False, indent=2, default=str)
            
        print("Data processed successfully. Exported to data.json in root and frontend.")
        
    except Exception as e:
        print("Error processing Excel:", e)

if __name__ == '__main__':
    process_excel()
