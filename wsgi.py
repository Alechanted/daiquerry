from waitress import serve
from app import create_app
from datetime import datetime
import socket

app = create_app()

host="0.0.0.0"
port=8000

def color_text(text, color_code):
    return f"\033[{color_code}m{text}\033[0m"

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

if __name__ == "__main__":
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    local_ip = get_local_ip()

    print(color_text(f"\nSerwer Flask wystartował!", "1;32"))  # Jasnozielony
    print(color_text(f"Czas startu: {now}", "1;36"))  # Jasnoniebieski
    print(color_text(f"Adres lokalny: http://localhost:{port}", "1;34"))
    print(color_text(f"Adres w sieci LAN: http://{local_ip}:{port}", "1;34"))
    print(color_text(f"Tryb: produkcyjny (Waitress)", "1;33"))  # Żółty
    print(color_text(f"Host: {host} | Port: {port}\n", "1;37"))  # Biały

    serve(app, host=host, port=port)
