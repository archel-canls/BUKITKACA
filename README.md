# 🛡️ Keamanan Multi-Faktor (MFA) ArchelStore

Dokumen ini menjelaskan implementasi teknis Keamanan Multi-Faktor (MFA) 4-Faktor di ArchelStore, yang dirancang untuk tugas Keamanan Siber. Fokus utama adalah pada mekanisme Hashing dan Enkripsi/Dekripsi untuk setiap faktor.

---

## 1. 🔑 Faktor Pengetahuan: Password (Firebase Authentication)

Password diamankan menggunakan algoritma Hashing modern dan kuat di sisi server Firebase.

### A. Algoritma dan Parameter SCRYPT

| Fitur | Implementasi di ArchelStore (via Firebase) |
| :--- | :--- |
| **Algoritma** | **SCRYPT** (Strong Key Derivation Function) |
| **Biaya Memori** | `mem_cost: 14` (Mengurangi serangan berbasis GPU) |
| **Iterasi/Rounds** | `rounds: 8` |
| **Salt & Key** | Dikelola Firebase, menggunakan `base64_signer_key` dan *salt* unik per pengguna. |

### B. Proses Keamanan (Hashing & Verifikasi)

| Proses | Deskripsi | Perhitungan (Konseptual) |
| :--- | :--- | :--- |
| **Penyimpanan**| Password ($P$) dikirim ke server via **TLS/HTTPS** (Enkripsi Transport Layer). Server menghitung *hash* yang memakan memori. | $$\text{Hash}_{\text{scrypt}} = \text{SCRYPT}(P, S, N=14, p=8)$$ |
| **Verifikasi** | Server menghitung ulang *hash* input ($P_{\text{input}}$) dan membandingkannya dengan $\text{Hash}_{\text{scrypt}}$ yang tersimpan. | **Tidak ada dekripsi.** Verifikasi adalah perbandingan $\text{Hash}_{\text{input}} = \text{Hash}_{\text{scrypt}}$. |

---

## 2. 🔑 Faktor Pengetahuan: PIN Keamanan (Realtime Database)

PIN digunakan untuk verifikasi transaksi (checkout). Karena PIN disimpan di Realtime Database, *hashing* manual diterapkan untuk keamanan ekstra.

### A. Algoritma yang Digunakan (Implementasi Tugas Siber)

| Fitur | Implementasi |
| :--- | :--- |
| **Algoritma** | **SHA-256** (Standard Hashing Algorithm) |
| **Salt** | *Salt* statis (`"PinSaltArchel"`) digabungkan dengan bagian dari UID pengguna ($S_{\text{uid}}$). |

### B. Proses Keamanan (Hashing Manual)

| Proses | Deskripsi | Perhitungan (Konseptual) |
| :--- | :--- | :--- |
| **Penyimpanan**| PIN mentah ($P_{\text{pin}}$) di-*hash* di sisi aplikasi Flutter. Hash dikirim via **TLS/HTTPS**. | $$\text{Hash}_{\text{pin}} = \text{SHA256}(P_{\text{pin}} \parallel S_{\text{uid}})$$ |
| **Verifikasi** | Aplikasi menghitung ulang $\text{Hash}_{\text{input}}$ dari PIN yang dimasukkan dan membandingkannya dengan $\text{Hash}_{\text{pin}}$ yang tersimpan. | **Verifikasi:** $\text{Hash}_{\text{input}} = \text{Hash}_{\text{pin}}$. |

---

## 3. 📧 Faktor Kepemilikan: OTP (One-Time Password)

Digunakan untuk verifikasi Email/Akun (diurus oleh Firebase Auth).

| Proses | Deskripsi | Konsep Keamanan |
| :--- | :--- | :--- |
| **Generasi** | Kode acak ($T$) dihasilkan oleh **PRNG** (Pseudo-Random Number Generator). | |
| **Pengiriman**| Kode $T$ dikirimkan ke Email pengguna. | Dilindungi oleh **Enkripsi Transport Layer (TLS/HTTPS)** antara server. |
| **Penyimpanan**| Kode $T$ yang valid di-*hash* dan disimpan sementara di *cache* server Firebase. | Kode mentah hanya terlihat oleh pengguna dan kedaluwarsa cepat. |
| **Verifikasi** | Server membandingkan *hash* dari input pengguna dengan *hash* kode $T$ yang tersimpan. | |

---

## 4. 👆 Faktor Inheren: Fingerprint/Biometrik

Digunakan untuk verifikasi cepat (Pembayaran/Login). Proses ini sepenuhnya bergantung pada keamanan perangkat keras.

### A. Algoritma dan Penyimpanan

| Fitur | Implementasi di ArchelStore |
| :--- | :--- |
| **Algoritma** | **Enkripsi Hardware** |
| **Penyimpanan** | **Secure Enclave** pada perangkat (terisolasi dari OS dan aplikasi). |
| **Data yang Disimpan** | Template Biometrik ($F$), dienkripsi oleh **Kunci Hardware Unik** ($K_{\text{hw}}$). |

### B. Proses Keamanan (Enkripsi/Dekripsi Hardware)

1.  **Enkripsi/Penyimpanan:** Template ($F$) diubah menjadi $E_{\text{template}}$ dan disimpan di *Secure Enclave*.
    $$\text{Penyimpanan} = E_{\text{template}}$$
2.  **Verifikasi:** Aplikasi memanggil API (`local_auth`). Proses perbandingan ($F_{\text{scan}}$ vs $E_{\text{template}}$) dilakukan di dalam *chip* khusus menggunakan $K_{\text{hw}}$ untuk dekripsi sementara.
3.  **Hasil:** Aplikasi hanya menerima respons Boolean ($R = \{\text{True}, \text{False}\}$). **Tidak ada data biometrik yang pernah keluar dari perangkat.**

---

### Kesimpulan Keamanan Siber

ArchelStore mengimplementasikan pertahanan berlapis:
* **Pertahanan Offline:** Hashing **SCRYPT** (Password) dan **SHA-256** (PIN) untuk melindungi kredensial jika terjadi kebocoran database.
* **Pertahanan Transit:** **TLS/HTTPS** untuk mengamankan semua data saat dikirim.
* **Pertahanan Hardware:** **Secure Enclave** untuk mengamankan data biometrik dan kunci dekripsi.
* 
