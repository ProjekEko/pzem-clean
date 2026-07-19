#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ============ 1. CONFIGURASI WIFI ============
#define WIFI_SSID "Iottt"
#define WIFI_PASSWORD "12345678"

// ============ 2. CONFIGURASI FIREBASE ============
#define API_KEY "AIzaSyDPp_SyvQJApKckpT-YpGBbfMMBAkpvj7A"
#define DATABASE_URL "https://pzemm-6b93a-default-rtdb.firebaseio.com/" 

// ============ 3. INISIALISASI ============
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long sendDataPrevMillis = 0;
unsigned long sendInterval = 5000; // Kirim tiap 5 detik

void setup() {
  Serial.begin(115200);

  // Koneksi WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\n✅ WiFi Connected!");

  // Konfigurasi Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (Firebase.ready() && (millis() - sendDataPrevMillis > sendInterval || sendDataPrevMillis == 0)) {
    sendDataPrevMillis = millis();

    // ========== GENERATE DUMMY DATA ==========
    // Simulasi data listrik 2 kamar
    float tegangan1 = 220.0 + random(-5, 5) / 10.0; // 219.5 - 220.5 V
    float arus1 = random(100, 500) / 100.0;         // 1.00 - 5.00 A
    float daya1 = tegangan1 * arus1;                // Watt
    float energi1 = daya1 * 0.001;                  // kWh (dummy)

    float tegangan2 = 220.0 + random(-5, 5) / 10.0;
    float arus2 = random(80, 400) / 100.0;
    float daya2 = tegangan2 * arus2;
    float energi2 = daya2 * 0.001;

    // ========== KIRIM KE FIREBASE ==========
    // Kamar 1
    Firebase.RTDB.setFloat(&fbdo, "/kamar_1/tegangan", tegangan1);
    Firebase.RTDB.setFloat(&fbdo, "/kamar_1/arus", arus1);
    Firebase.RTDB.setFloat(&fbdo, "/kamar_1/daya", daya1);
    Firebase.RTDB.setFloat(&fbdo, "/kamar_1/energi", energi1);
    Firebase.RTDB.setInt(&fbdo, "/kamar_1/timestamp", millis());

    // Kamar 2
    Firebase.RTDB.setFloat(&fbdo, "/kamar_2/tegangan", tegangan2);
    Firebase.RTDB.setFloat(&fbdo, "/kamar_2/arus", arus2);
    Firebase.RTDB.setFloat(&fbdo, "/kamar_2/daya", daya2);
    Firebase.RTDB.setFloat(&fbdo, "/kamar_2/energi", energi2);
    Firebase.RTDB.setInt(&fbdo, "/kamar_2/timestamp", millis());

    // ========== DETEKSI ANOMALI ==========
    // Jika daya > 500W, kirim alert ke Firebase
    if (daya1 > 500) {
      Firebase.RTDB.setString(&fbdo, "/alerts/kamar_1", "⚠️ Daya berlebih: " + String(daya1) + " Watt");
    } else {
      Firebase.RTDB.setString(&fbdo, "/alerts/kamar_1", "Normal");
    }

    if (daya2 > 500) {
      Firebase.RTDB.setString(&fbdo, "/alerts/kamar_2", "⚠️ Daya berlebih: " + String(daya2) + " Watt");
    } else {
      Firebase.RTDB.setString(&fbdo, "/alerts/kamar_2", "Normal");
    }

    // ========== LOG SERIAL ==========
    Serial.println("📤 Data terkirim:");
    Serial.println("  Kamar 1: " + String(daya1) + "W | " + String(arus1) + "A");
    Serial.println("  Kamar 2: " + String(daya2) + "W | " + String(arus2) + "A");
  }
}