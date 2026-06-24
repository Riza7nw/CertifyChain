// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CertifyChain
 * @author CertifyChain Team
 * @notice Smart contract untuk menerbitkan & memverifikasi sertifikat di blockchain.
 * @dev Data sertifikat lengkap (PDF, gambar, dsb.) disimpan off-chain. Yang di-anchor
 *      ke blockchain hanyalah HASH dari data tersebut (dataHash). Dengan begitu siapa pun
 *      bisa membuktikan keaslian sebuah sertifikat tanpa menyimpan data besar on-chain
 *      (hemat gas) dan tanpa membocorkan isi sertifikat (privasi).
 *
 *      Pola keamanan yang dipakai:
 *      - Akses penerbitan dibatasi (onlyOwner) -> mencegah penerbitan sertifikat palsu.
 *      - Custom errors (lebih hemat gas dari require string).
 *      - Checks-Effects-Interactions & validasi input ketat.
 *      - Tidak ada dependency eksternal -> langsung bisa dipakai di Remix tanpa npm.
 */
contract CertifyChain {
    /* ----------------------------------------------------------------------- */
    /*                                STORAGE                                   */
    /* ----------------------------------------------------------------------- */

    /// @notice Alamat admin/owner yang berhak menerbitkan & mencabut sertifikat.
    address public owner;

    /// @notice Jumlah total sertifikat yang pernah diterbitkan (termasuk yang dicabut).
    uint256 public totalCertificates;

    /**
     * @dev Struktur data satu sertifikat.
     *      Urutan field disusun untuk meminimalkan storage slot (packing):
     *      timestamp(uint64) + isValid(bool) + exists(bool) muat dalam 1 slot.
     */
    struct Certificate {
        string recipientName; // Nama penerima sertifikat
        string issuerName;    // Nama lembaga/penerbit
        bytes32 dataHash;     // Hash (mis. keccak256/sha256) dari dokumen sertifikat asli
        uint64 timestamp;     // Waktu penerbitan (block.timestamp) -- cukup sampai tahun ~584 miliar
        bool isValid;         // true = aktif, false = dicabut (revoked)
        bool exists;          // true jika certificateId ini sudah pernah diterbitkan
    }

    /**
     * @notice Penyimpanan sertifikat: certificateId (unik) -> data sertifikat.
     * @dev Memakai mapping (bukan array) agar lookup O(1) dan hemat gas.
     *      `private` + getter eksplisit (getCertificate) supaya kontrol return value rapi.
     */
    mapping(bytes32 => Certificate) private _certificates;

    /* ----------------------------------------------------------------------- */
    /*                                 EVENTS                                   */
    /* ----------------------------------------------------------------------- */

    /// @notice Diemit setiap kali sertifikat baru berhasil diterbitkan.
    /// @dev certificateId & issuer di-`indexed` agar mudah difilter oleh dapp/indexer.
    event CertificateIssued(
        bytes32 indexed certificateId,
        address indexed issuer,
        string recipientName,
        string issuerName,
        bytes32 dataHash,
        uint256 timestamp
    );

    /// @notice Diemit ketika sertifikat dicabut (revoked).
    event CertificateRevoked(bytes32 indexed certificateId, uint256 timestamp);

    /// @notice Diemit ketika kepemilikan kontrak dipindahkan.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /* ----------------------------------------------------------------------- */
    /*                             CUSTOM ERRORS                                */
    /* ----------------------------------------------------------------------- */

    error NotOwner();                       // Pemanggil bukan owner
    error CertificateAlreadyExists(bytes32 certificateId);
    error CertificateNotFound(bytes32 certificateId);
    error EmptyRecipientName();
    error EmptyIssuerName();
    error InvalidDataHash();
    error InvalidCertificateId();
    error ZeroAddress();

    /* ----------------------------------------------------------------------- */
    /*                               MODIFIERS                                  */
    /* ----------------------------------------------------------------------- */

    /// @dev Membatasi fungsi hanya untuk owner. Dipakai pada issue & revoke.
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /* ----------------------------------------------------------------------- */
    /*                              CONSTRUCTOR                                 */
    /* ----------------------------------------------------------------------- */

    /// @notice Saat deploy, alamat deployer otomatis menjadi owner.
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /* ----------------------------------------------------------------------- */
    /*                          FUNGSI MUTASI (WRITE)                           */
    /* ----------------------------------------------------------------------- */

    /**
     * @notice (1) Menerbitkan sertifikat baru. Hanya owner.
     * @param certificateId  ID unik sertifikat (mis. keccak256 dari nomor seri).
     * @param recipientName  Nama penerima (tidak boleh kosong).
     * @param issuerName     Nama penerbit (tidak boleh kosong).
     * @param dataHash       Hash dokumen sertifikat (tidak boleh 0x0).
     *
     * @dev Pola Checks-Effects-Interactions:
     *      1. Checks  -> validasi input & cek duplikasi.
     *      2. Effects -> tulis ke storage + naikkan counter.
     *      3. (tidak ada interaction eksternal).
     */
    function issueCertificate(
        bytes32 certificateId,
        string calldata recipientName,
        string calldata issuerName,
        bytes32 dataHash
    ) external onlyOwner {
        // --- Checks ---
        if (certificateId == bytes32(0)) revert InvalidCertificateId();
        if (bytes(recipientName).length == 0) revert EmptyRecipientName();
        if (bytes(issuerName).length == 0) revert EmptyIssuerName();
        if (dataHash == bytes32(0)) revert InvalidDataHash();
        if (_certificates[certificateId].exists) {
            revert CertificateAlreadyExists(certificateId);
        }

        // --- Effects ---
        _certificates[certificateId] = Certificate({
            recipientName: recipientName,
            issuerName: issuerName,
            dataHash: dataHash,
            timestamp: uint64(block.timestamp),
            isValid: true,
            exists: true
        });

        unchecked {
            // Aman dari overflow: mustahil tercapai 2^256 sertifikat.
            ++totalCertificates;
        }

        emit CertificateIssued(
            certificateId,
            msg.sender,
            recipientName,
            issuerName,
            dataHash,
            block.timestamp
        );
    }

    /**
     * @notice Mencabut (revoke) sebuah sertifikat. Hanya owner.
     * @dev Data tetap tersimpan untuk audit trail; hanya status isValid yang diubah.
     * @param certificateId ID sertifikat yang akan dicabut.
     */
    function revokeCertificate(bytes32 certificateId) external onlyOwner {
        Certificate storage cert = _certificates[certificateId];
        if (!cert.exists) revert CertificateNotFound(certificateId);

        cert.isValid = false;
        emit CertificateRevoked(certificateId, block.timestamp);
    }

    /**
     * @notice Memindahkan kepemilikan kontrak ke alamat lain. Hanya owner.
     * @param newOwner Alamat owner baru (tidak boleh 0x0).
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /* ----------------------------------------------------------------------- */
    /*                          FUNGSI BACA (VIEW)                              */
    /* ----------------------------------------------------------------------- */

    /**
     * @notice (2) Verifikasi cepat: apakah sertifikat ada DAN masih aktif?
     * @param certificateId ID sertifikat.
     * @return valid true jika sertifikat ada dan belum dicabut.
     */
    function verifyCertificate(bytes32 certificateId) external view returns (bool valid) {
        Certificate storage cert = _certificates[certificateId];
        return cert.exists && cert.isValid;
    }

    /**
     * @notice Verifikasi ketat: cocokkan ID sekaligus hash dokumen yang dipegang verifier.
     * @dev Berguna agar verifier bisa membuktikan bahwa file di tangannya benar-benar
     *      yang di-anchor on-chain (anti-tamper), bukan sekadar "ID-nya ada".
     * @param certificateId ID sertifikat.
     * @param dataHash      Hash dokumen yang ingin dicocokkan.
     * @return true jika sertifikat ada, masih aktif, dan hash cocok.
     */
    function verifyCertificateWithHash(bytes32 certificateId, bytes32 dataHash)
        external
        view
        returns (bool)
    {
        Certificate storage cert = _certificates[certificateId];
        return cert.exists && cert.isValid && cert.dataHash == dataHash;
    }

    /**
     * @notice (3) Mengambil seluruh data sebuah sertifikat berdasarkan ID.
     * @param certificateId ID sertifikat.
     * @dev Revert jika sertifikat tidak ditemukan agar caller tidak salah membaca data kosong.
     * @return recipientName Nama penerima.
     * @return issuerName    Nama penerbit.
     * @return dataHash      Hash dokumen.
     * @return timestamp     Waktu penerbitan (unix time).
     * @return isValid       Status aktif/dicabut.
     */
    function getCertificate(bytes32 certificateId)
        external
        view
        returns (
            string memory recipientName,
            string memory issuerName,
            bytes32 dataHash,
            uint256 timestamp,
            bool isValid
        )
    {
        Certificate storage cert = _certificates[certificateId];
        if (!cert.exists) revert CertificateNotFound(certificateId);

        return (
            cert.recipientName,
            cert.issuerName,
            cert.dataHash,
            cert.timestamp,
            cert.isValid
        );
    }

    /* ----------------------------------------------------------------------- */
    /*                          UTILITAS (HELPER)                               */
    /* ----------------------------------------------------------------------- */

    /**
     * @notice Helper untuk menghitung dataHash dari sebuah string di on-chain.
     * @dev Umumnya hash dihitung off-chain dari file asli; fungsi ini disediakan
     *      untuk kemudahan testing/demo. `pure` -> tidak baca/tulis storage.
     */
    function computeHash(string calldata data) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(data));
    }
}
