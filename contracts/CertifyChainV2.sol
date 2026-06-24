// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CertifyChainV2
 * @notice Versi dengan SECURITY LAYER: role-based access control + emergency pause.
 * @dev Memakai OpenZeppelin (audited) — standar industri untuk manajemen role.
 *
 *      Model role:
 *      - DEFAULT_ADMIN_ROLE : "owner/admin". Mengelola role (grant/revoke ISSUER),
 *        dan bisa pause/unpause kontrak. TIDAK otomatis bisa issue kecuali juga ISSUER.
 *      - ISSUER_ROLE        : pihak yang boleh menerbitkan/mencabut sertifikat.
 *      - Public verifier     : SIAPA SAJA. Fungsi view (verify/get) tidak butuh role.
 *
 *      Keamanan utama:
 *      - issueCertificate -> onlyRole(ISSUER_ROLE) + whenNotPaused.
 *      - Cegah duplikat via flag `exists`.
 *      - `issuedBy` dicatat on-chain + event => audit trail yang tak bisa diubah.
 *
 *      Instal dependency: npm install (paket OpenZeppelin contracts).
 *      Di Remix, import dari path OpenZeppelin otomatis di-resolve.
 */
contract CertifyChainV2 is AccessControl, Pausable {
    /// @notice Role untuk pihak yang berhak menerbitkan sertifikat.
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    /// @notice Jumlah total sertifikat yang pernah diterbitkan.
    uint256 public totalCertificates;

    /// @dev Data satu sertifikat. `issuedBy` untuk keperluan audit.
    struct Certificate {
        string recipientName;
        string issuerName;
        bytes32 dataHash;
        uint64 timestamp;
        address issuedBy; // alamat ISSUER yang menerbitkan (audit)
        bool isValid;
        bool exists;
    }

    /// @notice certificateId (unik) -> data sertifikat.
    mapping(bytes32 => Certificate) private _certificates;

    /* --------------------------------- Events -------------------------------- */

    /// @notice Audit trail on-chain: dipancarkan saat sertifikat diterbitkan.
    event CertificateIssued(
        bytes32 indexed certificateId,
        address indexed issuedBy,
        string recipientName,
        string issuerName,
        bytes32 dataHash,
        uint256 timestamp
    );

    /// @notice Dipancarkan saat sertifikat dicabut.
    event CertificateRevoked(bytes32 indexed certificateId, address indexed revokedBy, uint256 timestamp);

    /* --------------------------------- Errors -------------------------------- */

    error CertificateAlreadyExists(bytes32 certificateId);
    error CertificateNotFound(bytes32 certificateId);
    error EmptyRecipientName();
    error EmptyIssuerName();
    error InvalidDataHash();
    error InvalidCertificateId();
    error ZeroAddress();

    /* ------------------------------- Constructor ------------------------------ */

    /**
     * @param admin Alamat admin awal. Mendapat DEFAULT_ADMIN_ROLE + ISSUER_ROLE.
     * @dev Memisahkan `admin` dari `msg.sender` memungkinkan deploy via factory/multisig.
     */
    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
    }

    /* ------------------------------ Write (issuer) ---------------------------- */

    /**
     * @notice Menerbitkan sertifikat. Hanya ISSUER_ROLE & saat kontrak tidak di-pause.
     */
    function issueCertificate(
        bytes32 certificateId,
        string calldata recipientName,
        string calldata issuerName,
        bytes32 dataHash
    ) external onlyRole(ISSUER_ROLE) whenNotPaused {
        // --- Checks ---
        if (certificateId == bytes32(0)) revert InvalidCertificateId();
        if (bytes(recipientName).length == 0) revert EmptyRecipientName();
        if (bytes(issuerName).length == 0) revert EmptyIssuerName();
        if (dataHash == bytes32(0)) revert InvalidDataHash();
        if (_certificates[certificateId].exists) revert CertificateAlreadyExists(certificateId);

        // --- Effects ---
        _certificates[certificateId] = Certificate({
            recipientName: recipientName,
            issuerName: issuerName,
            dataHash: dataHash,
            timestamp: uint64(block.timestamp),
            issuedBy: msg.sender,
            isValid: true,
            exists: true
        });

        unchecked {
            ++totalCertificates;
        }

        emit CertificateIssued(certificateId, msg.sender, recipientName, issuerName, dataHash, block.timestamp);
    }

    /**
     * @notice Mencabut sertifikat. Hanya ISSUER_ROLE. (Boleh saat pause untuk respons insiden.)
     */
    function revokeCertificate(bytes32 certificateId) external onlyRole(ISSUER_ROLE) {
        Certificate storage cert = _certificates[certificateId];
        if (!cert.exists) revert CertificateNotFound(certificateId);

        cert.isValid = false;
        emit CertificateRevoked(certificateId, msg.sender, block.timestamp);
    }

    /* ------------------------------ Admin controls ---------------------------- */

    /// @notice Hentikan sementara penerbitan (emergency stop). Hanya admin.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Lanjutkan kembali. Hanya admin.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /* -------------------------------- Read (public) --------------------------- */

    /// @notice Cek cepat: sertifikat ada & masih aktif? (publik, tanpa role)
    function verifyCertificate(bytes32 certificateId) external view returns (bool) {
        Certificate storage cert = _certificates[certificateId];
        return cert.exists && cert.isValid;
    }

    /// @notice Verifikasi ketat: cocokkan juga hash dokumen (anti-tamper).
    function verifyCertificateWithHash(bytes32 certificateId, bytes32 dataHash)
        external
        view
        returns (bool)
    {
        Certificate storage cert = _certificates[certificateId];
        return cert.exists && cert.isValid && cert.dataHash == dataHash;
    }

    /// @notice Ambil detail lengkap sertifikat (publik). Revert jika tidak ada.
    function getCertificate(bytes32 certificateId)
        external
        view
        returns (
            string memory recipientName,
            string memory issuerName,
            bytes32 dataHash,
            uint256 timestamp,
            address issuedBy,
            bool isValid
        )
    {
        Certificate storage cert = _certificates[certificateId];
        if (!cert.exists) revert CertificateNotFound(certificateId);
        return (cert.recipientName, cert.issuerName, cert.dataHash, cert.timestamp, cert.issuedBy, cert.isValid);
    }

    /// @notice Helper: apakah `account` punya hak terbit?
    function isIssuer(address account) external view returns (bool) {
        return hasRole(ISSUER_ROLE, account);
    }

    /// @notice Helper hash (keccak256) — untuk demo/testing.
    function computeHash(string calldata data) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(data));
    }
}
