#include <PZEM004Tv30.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// ==================== KONFIGURASI WIFI ====================
#define WIFI_SSID "iottt"
#define WIFI_PASSWORD "12345678"

// ==================== KONFIGURASI FIREBASE ====================
#define API_KEY "AIzaSyDPp_SyvQJApKckpT-YpGBbfMMBAkpvj7A"
#define DATABASE_URL "https://pzemm-6b93a-default-rtdb.firebaseio.com/"

// ==================== KONFIGURASI PIN ====================
// SET 1
#define PZEM1_RX 16
#define PZEM1_TX 17
#define BUZZER1_PIN 12
#define RELAY1_PIN 14
#define BUTTON_RESET1_PIN 4

// SET 2
#define PZEM2_RX 18
#define PZEM2_TX 19
#define BUZZER2_PIN 13
#define RELAY2_PIN 15
#define BUTTON_RESET2_PIN 5

// ==================== THRESHOLD ====================
#define ARUS_NORMAL 2.0
#define ARUS_WARNING 3.0
#define ARUS_KRITIS 4.0
#define TEGANGAN_MIN 50.0

// ==================== OBJECT ====================
PZEM004Tv30 pzem1(Serial2, PZEM1_RX, PZEM1_TX);
PZEM004Tv30 pzem2(Serial1, PZEM2_RX, PZEM2_TX);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ==================== VARIABEL SET 1 ====================
float voltage1, current1, power1, energy1, frequency1, pf1;
String statusSistem1 = "NORMAL";
String lastStatus1 = "";
bool relayState1 = true;
bool buzzerState1 = false;
unsigned long buzzerTimer1 = 0;
String tripReason1 = "";

// ==================== VARIABEL SET 2 ====================
float voltage2, current2, power2, energy2, frequency2, pf2;
String statusSistem2 = "NORMAL";
String lastStatus2 = "";
bool relayState2 = true;
bool buzzerState2 = false;
unsigned long buzzerTimer2 = 0;
String tripReason2 = "";

// ==================== VARIABEL UMUM ====================
bool autoReset = true;
unsigned long lastRead = 0;
unsigned long lastFirebase = 0;
const unsigned long READ_INTERVAL = 1000;
const unsigned long FIREBASE_INTERVAL = 5000;
const unsigned long BUZZER_INTERVAL = 500;

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  
  // Init Serial PZEM
  Serial2.begin(9600, SERIAL_8N1, PZEM1_RX, PZEM1_TX);
  Serial1.begin(9600, SERIAL_8N1, PZEM2_RX, PZEM2_TX);
  
  // Init Pin
  pinMode(BUZZER1_PIN, OUTPUT); pinMode(RELAY1_PIN, OUTPUT);
  pinMode(BUZZER2_PIN, OUTPUT); pinMode(RELAY2_PIN, OUTPUT);
  pinMode(BUTTON_RESET1_PIN, INPUT_PULLUP);
  pinMode(BUTTON_RESET2_PIN, INPUT_PULLUP);
  
  digitalWrite(BUZZER1_PIN, LOW); digitalWrite(RELAY1_PIN, LOW);
  digitalWrite(BUZZER2_PIN, LOW); digitalWrite(RELAY2_PIN, LOW);
  
  Serial.println("\n╔══════════════════════════════════════╗");
  Serial.println("║  MONITORING LISTRIK 2 TITIK + FB    ║");
  Serial.println("╚══════════════════════════════════════╝");
  
  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\n✅ WiFi Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  // ============ FIREBASE (Tanpa Auth) ============
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  // Tidak perlu auth.user.email dan password
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.print("Connecting Firebase");
  int timeout = 0;
  while (!Firebase.ready() && timeout < 30) {
    Serial.print(".");
    delay(300);
    timeout++;
  }
  Serial.println(Firebase.ready() ? "\n✅ Firebase Connected!" : "\n❌ Firebase Gagal!");
  
  // Cek sensor
  Serial.print("PZEM 1: ");
  float tv1 = pzem1.voltage();
  Serial.println((!isnan(tv1) && tv1 > 0) ? "OK!" : "GAGAL!");
  Serial.print("PZEM 2: ");
  float tv2 = pzem2.voltage();
  Serial.println((!isnan(tv2) && tv2 > 0) ? "OK!" : "GAGAL!");
  
  // Set data awal Firebase
  if (Firebase.ready()) {
    Firebase.RTDB.setString(&fbdo, "/sistem/status", "ONLINE");
  }
  
  Serial.println("\n✅ Sistem Siap!\n");
  delay(1000);
}

// ==================== LOOP ====================
void loop() {
  unsigned long now = millis();
  
  if (now - lastRead >= READ_INTERVAL) {
    lastRead = now;
    
    bacaSensor1(); cekStatus1(); kontrolRelay1(); kontrolBuzzer1(now); cekTombolReset1();
    bacaSensor2(); cekStatus2(); kontrolRelay2(); kontrolBuzzer2(now); cekTombolReset2();
    
    tampilSerial();
  }
  
  if (now - lastFirebase >= FIREBASE_INTERVAL) {
    lastFirebase = now;
    if (Firebase.ready()) {
      kirimFirebase();
    } else {
      Serial.println("⚠️ Firebase tidak ready, coba reconnect...");
      Firebase.reconnectWiFi(true);
    }
  }
}

// ==================== SET 1 ====================
void bacaSensor1() {
  voltage1 = pzem1.voltage(); current1 = pzem1.current(); power1 = pzem1.power();
  energy1 = pzem1.energy(); frequency1 = pzem1.frequency(); pf1 = pzem1.pf();
  if (isnan(voltage1)) voltage1 = 0; if (isnan(current1)) current1 = 0;
  if (isnan(power1)) power1 = 0; if (isnan(energy1)) energy1 = 0;
  if (isnan(frequency1)) frequency1 = 0; if (isnan(pf1)) pf1 = 0;
}

void cekStatus1() {
  lastStatus1 = statusSistem1;
  if (voltage1 < TEGANGAN_MIN && voltage1 >= 0) statusSistem1 = "TOKEN_HABIS";
  else if (!relayState1 && statusSistem1 != "TOKEN_HABIS") statusSistem1 = "RELAY_TRIP";
  else if (current1 >= ARUS_KRITIS) statusSistem1 = "KRITIS";
  else if (current1 >= ARUS_WARNING) statusSistem1 = "WARNING";
  else statusSistem1 = "NORMAL";
}

void kontrolRelay1() {
  if (statusSistem1 == "KRITIS" || statusSistem1 == "TOKEN_HABIS") {
    if (relayState1) {
      digitalWrite(RELAY1_PIN, HIGH); relayState1 = false;
      tripReason1 = (statusSistem1 == "KRITIS") ? "Arus: " + String(current1,1) + "A" : "Teg: " + String(voltage1,1) + "V";
      Serial.print("\n🚨 [TITIK 1] RELAY OFF! "); Serial.println(tripReason1);
      kirimNotifikasi(1);
    }
  } else if (statusSistem1 == "NORMAL") {
    if (!relayState1 && autoReset) {
      digitalWrite(RELAY1_PIN, LOW); relayState1 = true; tripReason1 = "";
      Serial.println("\n✅ [TITIK 1] RELAY ON!");
      kirimNotifikasi(1);
    }
  }
}

void kontrolBuzzer1(unsigned long now) {
  if (statusSistem1 == "KRITIS" || statusSistem1 == "TOKEN_HABIS" || statusSistem1 == "RELAY_TRIP") {
    digitalWrite(BUZZER1_PIN, HIGH);
  } else if (statusSistem1 == "WARNING") {
    if (now - buzzerTimer1 >= BUZZER_INTERVAL) {
      buzzerTimer1 = now; buzzerState1 = !buzzerState1;
      digitalWrite(BUZZER1_PIN, buzzerState1);
    }
  } else { digitalWrite(BUZZER1_PIN, LOW); buzzerState1 = false; }
}

void cekTombolReset1() {
  if (digitalRead(BUTTON_RESET1_PIN) == LOW) {
    delay(50);
    if (digitalRead(BUTTON_RESET1_PIN) == LOW && !relayState1) {
      if (voltage1 >= TEGANGAN_MIN && current1 < ARUS_KRITIS) {
        digitalWrite(RELAY1_PIN, LOW); relayState1 = true; tripReason1 = ""; statusSistem1 = "NORMAL";
        Serial.println("✅ [TITIK 1] Reset berhasil!");
        kirimNotifikasi(1);
      }
      while (digitalRead(BUTTON_RESET1_PIN) == LOW) delay(10);
    }
  }
}

// ==================== SET 2 ====================
void bacaSensor2() {
  voltage2 = pzem2.voltage(); current2 = pzem2.current(); power2 = pzem2.power();
  energy2 = pzem2.energy(); frequency2 = pzem2.frequency(); pf2 = pzem2.pf();
  if (isnan(voltage2)) voltage2 = 0; if (isnan(current2)) current2 = 0;
  if (isnan(power2)) power2 = 0; if (isnan(energy2)) energy2 = 0;
  if (isnan(frequency2)) frequency2 = 0; if (isnan(pf2)) pf2 = 0;
}

void cekStatus2() {
  lastStatus2 = statusSistem2;
  if (voltage2 < TEGANGAN_MIN && voltage2 >= 0) statusSistem2 = "TOKEN_HABIS";
  else if (!relayState2 && statusSistem2 != "TOKEN_HABIS") statusSistem2 = "RELAY_TRIP";
  else if (current2 >= ARUS_KRITIS) statusSistem2 = "KRITIS";
  else if (current2 >= ARUS_WARNING) statusSistem2 = "WARNING";
  else statusSistem2 = "NORMAL";
}

void kontrolRelay2() {
  if (statusSistem2 == "KRITIS" || statusSistem2 == "TOKEN_HABIS") {
    if (relayState2) {
      digitalWrite(RELAY2_PIN, HIGH); relayState2 = false;
      tripReason2 = (statusSistem2 == "KRITIS") ? "Arus: " + String(current2,1) + "A" : "Teg: " + String(voltage2,1) + "V";
      Serial.print("\n🚨 [TITIK 2] RELAY OFF! "); Serial.println(tripReason2);
      kirimNotifikasi(2);
    }
  } else if (statusSistem2 == "NORMAL") {
    if (!relayState2 && autoReset) {
      digitalWrite(RELAY2_PIN, LOW); relayState2 = true; tripReason2 = "";
      Serial.println("\n✅ [TITIK 2] RELAY ON!");
      kirimNotifikasi(2);
    }
  }
}

void kontrolBuzzer2(unsigned long now) {
  if (statusSistem2 == "KRITIS" || statusSistem2 == "TOKEN_HABIS" || statusSistem2 == "RELAY_TRIP") {
    digitalWrite(BUZZER2_PIN, HIGH);
  } else if (statusSistem2 == "WARNING") {
    if (now - buzzerTimer2 >= BUZZER_INTERVAL) {
      buzzerTimer2 = now; buzzerState2 = !buzzerState2;
      digitalWrite(BUZZER2_PIN, buzzerState2);
    }
  } else { digitalWrite(BUZZER2_PIN, LOW); buzzerState2 = false; }
}

void cekTombolReset2() {
  if (digitalRead(BUTTON_RESET2_PIN) == LOW) {
    delay(50);
    if (digitalRead(BUTTON_RESET2_PIN) == LOW && !relayState2) {
      if (voltage2 >= TEGANGAN_MIN && current2 < ARUS_KRITIS) {
        digitalWrite(RELAY2_PIN, LOW); relayState2 = true; tripReason2 = ""; statusSistem2 = "NORMAL";
        Serial.println("✅ [TITIK 2] Reset berhasil!");
        kirimNotifikasi(2);
      }
      while (digitalRead(BUTTON_RESET2_PIN) == LOW) delay(10);
    }
  }
}

// ==================== TAMPIL SERIAL ====================
void tampilSerial() {
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║      MONITORING LISTRIK 2 TITIK     ║");
  Serial.println("╠══════════════════════════════════════╣");
  
  Serial.printf("║ [1] V:%5.1fV A:%5.3fA W:%5.1fW   ║\n", voltage1, current1, power1);
  Serial.print("║ Status: "); Serial.print(statusSistem1);
  Serial.print(" | Relay: "); Serial.print(relayState1 ? "ON" : "OFF");
  Serial.print(" | Buzz: "); Serial.print(statusSistem1 == "NORMAL" ? "DIAM" : "BUNYI");
  Serial.println("     ║");
  
  Serial.println("╠══════════════════════════════════════╣");
  
  Serial.printf("║ [2] V:%5.1fV A:%5.3fA W:%5.1fW   ║\n", voltage2, current2, power2);
  Serial.print("║ Status: "); Serial.print(statusSistem2);
  Serial.print(" | Relay: "); Serial.print(relayState2 ? "ON" : "OFF");
  Serial.print(" | Buzz: "); Serial.print(statusSistem2 == "NORMAL" ? "DIAM" : "BUNYI");
  Serial.println("     ║");
  
  Serial.println("╚══════════════════════════════════════╝\n");
}

// ==================== KIRIM FIREBASE ====================
void kirimFirebase() {
  if (!Firebase.ready()) return;
  
  // ============ KAMAR 1 ============
  Firebase.RTDB.setFloat(&fbdo, "/kamar_1/tegangan", voltage1);
  Firebase.RTDB.setFloat(&fbdo, "/kamar_1/arus", current1);
  Firebase.RTDB.setFloat(&fbdo, "/kamar_1/daya", power1);
  Firebase.RTDB.setFloat(&fbdo, "/kamar_1/energi", energy1);
  Firebase.RTDB.setString(&fbdo, "/kamar_1/status", statusSistem1);
  Firebase.RTDB.setBool(&fbdo, "/kamar_1/relay", relayState1);
  
  // Alert untuk web
  String alert1 = (statusSistem1 == "KRITIS" || statusSistem1 == "WARNING") 
                  ? "⚠️ Daya berlebih: " + String(power1, 1) + " W" 
                  : "Normal";
  Firebase.RTDB.setString(&fbdo, "/alerts/kamar_1", alert1);
  
  // ============ KAMAR 2 ============
  Firebase.RTDB.setFloat(&fbdo, "/kamar_2/tegangan", voltage2);
  Firebase.RTDB.setFloat(&fbdo, "/kamar_2/arus", current2);
  Firebase.RTDB.setFloat(&fbdo, "/kamar_2/daya", power2);
  Firebase.RTDB.setFloat(&fbdo, "/kamar_2/energi", energy2);
  Firebase.RTDB.setString(&fbdo, "/kamar_2/status", statusSistem2);
  Firebase.RTDB.setBool(&fbdo, "/kamar_2/relay", relayState2);
  
  String alert2 = (statusSistem2 == "KRITIS" || statusSistem2 == "WARNING") 
                  ? "⚠️ Daya berlebih: " + String(power2, 1) + " W" 
                  : "Normal";
  Firebase.RTDB.setString(&fbdo, "/alerts/kamar_2", alert2);
  
  // ============ SISTEM ============
  Firebase.RTDB.setString(&fbdo, "/sistem/status", "ONLINE");
  Firebase.RTDB.setTimestamp(&fbdo, "/sistem/lastUpdate");
  
  Serial.println("✅ Data terkirim ke Firebase");
}

// ==================== NOTIFIKASI ====================
void kirimNotifikasi(int titik) {
  if (!Firebase.ready()) return;
  
  String path = "/history/" + String(titik) + "/" + String(millis());
  
  if (titik == 1) {
    Firebase.RTDB.setString(&fbdo, path + "/event", "STATUS_BERUBAH");
    Firebase.RTDB.setString(&fbdo, path + "/status", statusSistem1);
    Firebase.RTDB.setFloat(&fbdo, path + "/arus", current1);
    Firebase.RTDB.setFloat(&fbdo, path + "/daya", power1);
    Firebase.RTDB.setBool(&fbdo, path + "/relay", relayState1);
    Firebase.RTDB.setString(&fbdo, path + "/alasan", tripReason1);
  } else {
    Firebase.RTDB.setString(&fbdo, path + "/event", "STATUS_BERUBAH");
    Firebase.RTDB.setString(&fbdo, path + "/status", statusSistem2);
    Firebase.RTDB.setFloat(&fbdo, path + "/arus", current2);
    Firebase.RTDB.setFloat(&fbdo, path + "/daya", power2);
    Firebase.RTDB.setBool(&fbdo, path + "/relay", relayState2);
    Firebase.RTDB.setString(&fbdo, path + "/alasan", tripReason2);
  }
  
  Serial.printf("📢 Notif [TITIK %d] → Firebase!\n", titik);
}