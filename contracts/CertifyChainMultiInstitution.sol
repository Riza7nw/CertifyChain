// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CertifyChainMultiInstitution (V3)
 * @notice Versi SCALABLE: multi-institusi + penyimpanan file via IPFS (CID).
 * @dev Prinsip skalabilitas yang dipakai:
 *      - On-chain MINIMAL: hanya simpan institutionId, dataHash, dan fileCid (IPFS).
 *        File besar (PDF/gambar) TIDAK pernah di chain -> hemat gas & tak terbatas.
 *      - PII (nama penerima dll) TIDAK disimpan on-chain (privasi). Disimpan off-chain
 *        (IPFS/DB); chain cukup memegang dataHash sebagai bukti integritas.
 *      - Event kaya (rich events) -> di-index off-chain oleh layanan indexer untuk
 *        query cepat (dashboard, statistik) tanpa membebani node RPC.
 *
 *      Model role (berbasis OpenZeppelin AccessControl):
 *      - DEFAULT_ADMIN_ROLE  : PLATFORM admin. Mendaftarkan institusi, pause.
 *      - institutionAdminRole(id) : admin tiap institusi (kelola issuer-nya sendiri).
 *      - issuerRole(id)           : akun yang boleh menerbitkan untuk institusi tsb.
 *      Sehingga tiap institusi punya "issuer account"-nya sendiri & terisolasi.
 */
contract CertifyChainMultiInstitution is AccessControl, Pausable {
    /* --------------------------------- Types --------------------------------- */

    struct Institution {
        string name;
        string metadataCid; // IPFS CID metadata/logo institusi (opsional)
        address admin;
        bool active;
        bool exists;
    }

    struct Certificate {
        uint256 institutionId;
        bytes32 dataHash; // hash kanonik data sertifikat (PII off-chain)
        string fileCid; // IPFS CID file sertifikat (PDF/gambar)
        uint64 timestamp;
        address issuedBy;
        bool isValid;
        bool exists;
    }

    /* -------------------------------- Storage -------------------------------- */

    uint256 public institutionCount; // juga berperan sebagai id terakhir
    uint256 public totalCertificates;

    mapping(uint256 => Institution) private _institutions;
    mapping(bytes32 => Certificate) private _certificates;

    /* --------------------------- Role derivation ----------------------------- */

    /// @notice Role admin untuk sebuah institusi (mengelola issuer institusi itu).
    function institutionAdminRole(uint256 institutionId) public pure returns (bytes32) {
        return keccak256(abi.encode("INSTITUTION_ADMIN_ROLE", institutionId));
    }

    /// @notice Role issuer untuk sebuah institusi (boleh menerbitkan sertifikat).
    function issuerRole(uint256 institutionId) public pure returns (bytes32) {
        return keccak256(abi.encode("ISSUER_ROLE", institutionId));
    }

    /* --------------------------------- Events -------------------------------- */

    event InstitutionRegistered(
        uint256 indexed institutionId,
        address indexed admin,
        string name,
        string metadataCid
    );
    event InstitutionStatusChanged(uint256 indexed institutionId, bool active);
    event IssuerAdded(uint256 indexed institutionId, address indexed issuer);
    event IssuerRemoved(uint256 indexed institutionId, address indexed issuer);

    event CertificateIssued(
        bytes32 indexed certificateId,
        uint256 indexed institutionId,
        address indexed issuedBy,
        bytes32 dataHash,
        string fileCid,
        uint256 timestamp
    );
    event CertificateRevoked(
        bytes32 indexed certificateId,
        uint256 indexed institutionId,
        address indexed revokedBy,
        uint256 timestamp
    );

    /* --------------------------------- Errors -------------------------------- */

    error ZeroAddress();
    error EmptyName();
    error EmptyFileCid();
    error InstitutionNotFound(uint256 institutionId);
    error InstitutionInactive(uint256 institutionId);
    error NotIssuer(uint256 institutionId);
    error CertificateAlreadyExists(bytes32 certificateId);
    error CertificateNotFound(bytes32 certificateId);
    error InvalidCertificateId();
    error InvalidDataHash();

    /* ------------------------------ Constructor ------------------------------ */

    constructor(address platformAdmin) {
        if (platformAdmin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, platformAdmin);
    }

    /* ----------------------------- Platform admin ---------------------------- */

    /**
     * @notice Mendaftarkan institusi baru. Hanya PLATFORM admin.
     * @return institutionId id institusi yang dibuat.
     */
    function registerInstitution(
        address admin,
        string calldata name,
        string calldata metadataCid
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256 institutionId) {
        if (admin == address(0)) revert ZeroAddress();
        if (bytes(name).length == 0) revert EmptyName();

        institutionId = ++institutionCount;
        _institutions[institutionId] = Institution({
            name: name,
            metadataCid: metadataCid,
            admin: admin,
            active: true,
            exists: true
        });

        // Hirarki role: admin institusi mengelola issuer institusinya.
        bytes32 adminRole = institutionAdminRole(institutionId);
        bytes32 issRole = issuerRole(institutionId);
        _setRoleAdmin(issRole, adminRole);
        _setRoleAdmin(adminRole, DEFAULT_ADMIN_ROLE);
        _grantRole(adminRole, admin);
        _grantRole(issRole, admin); // admin institusi juga bisa menerbitkan

        emit InstitutionRegistered(institutionId, admin, name, metadataCid);
    }

    /// @notice Aktif/nonaktifkan institusi (mis. suspend). Hanya PLATFORM admin.
    function setInstitutionActive(uint256 institutionId, bool active)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (!_institutions[institutionId].exists) revert InstitutionNotFound(institutionId);
        _institutions[institutionId].active = active;
        emit InstitutionStatusChanged(institutionId, active);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /* --------------------------- Institution admin --------------------------- */

    /**
     * @notice Menambah issuer untuk sebuah institusi.
     * @dev grantRole internal memeriksa bahwa msg.sender adalah admin institusi
     *      (karena roleAdmin issuerRole = institutionAdminRole).
     */
    function addIssuer(uint256 institutionId, address issuer) external {
        if (!_institutions[institutionId].exists) revert InstitutionNotFound(institutionId);
        if (issuer == address(0)) revert ZeroAddress();
        grantRole(issuerRole(institutionId), issuer); // re-cek otorisasi di dalam
        emit IssuerAdded(institutionId, issuer);
    }

    /// @notice Mencabut issuer dari sebuah institusi.
    function removeIssuer(uint256 institutionId, address issuer) external {
        revokeRole(issuerRole(institutionId), issuer); // re-cek otorisasi di dalam
        emit IssuerRemoved(institutionId, issuer);
    }

    /* ------------------------------ Issue / revoke --------------------------- */

    /**
     * @notice Menerbitkan sertifikat atas nama sebuah institusi.
     * @param institutionId institusi penerbit.
     * @param certificateId id unik sertifikat (bytes32).
     * @param dataHash      hash kanonik data sertifikat (keccak256).
     * @param fileCid       IPFS CID dari file sertifikat (PDF/gambar).
     */
    function issueCertificate(
        uint256 institutionId,
        bytes32 certificateId,
        bytes32 dataHash,
        string calldata fileCid
    ) external whenNotPaused {
        Institution storage inst = _institutions[institutionId];
        if (!inst.exists) revert InstitutionNotFound(institutionId);
        if (!inst.active) revert InstitutionInactive(institutionId);
        if (!hasRole(issuerRole(institutionId), msg.sender)) revert NotIssuer(institutionId);

        if (certificateId == bytes32(0)) revert InvalidCertificateId();
        if (dataHash == bytes32(0)) revert InvalidDataHash();
        if (bytes(fileCid).length == 0) revert EmptyFileCid();
        if (_certificates[certificateId].exists) revert CertificateAlreadyExists(certificateId);

        _certificates[certificateId] = Certificate({
            institutionId: institutionId,
            dataHash: dataHash,
            fileCid: fileCid,
            timestamp: uint64(block.timestamp),
            issuedBy: msg.sender,
            isValid: true,
            exists: true
        });

        unchecked {
            ++totalCertificates;
        }

        emit CertificateIssued(certificateId, institutionId, msg.sender, dataHash, fileCid, block.timestamp);
    }

    /// @notice Mencabut sertifikat. Hanya issuer institusi terkait.
    function revokeCertificate(bytes32 certificateId) external {
        Certificate storage cert = _certificates[certificateId];
        if (!cert.exists) revert CertificateNotFound(certificateId);
        if (!hasRole(issuerRole(cert.institutionId), msg.sender)) revert NotIssuer(cert.institutionId);

        cert.isValid = false;
        emit CertificateRevoked(certificateId, cert.institutionId, msg.sender, block.timestamp);
    }

    /* -------------------------------- Read (public) -------------------------- */

    function verifyCertificate(bytes32 certificateId) external view returns (bool) {
        Certificate storage cert = _certificates[certificateId];
        return cert.exists && cert.isValid;
    }

    function verifyCertificateWithHash(bytes32 certificateId, bytes32 dataHash)
        external
        view
        returns (bool)
    {
        Certificate storage cert = _certificates[certificateId];
        return cert.exists && cert.isValid && cert.dataHash == dataHash;
    }

    function getCertificate(bytes32 certificateId)
        external
        view
        returns (
            uint256 institutionId,
            bytes32 dataHash,
            string memory fileCid,
            uint256 timestamp,
            address issuedBy,
            bool isValid
        )
    {
        Certificate storage cert = _certificates[certificateId];
        if (!cert.exists) revert CertificateNotFound(certificateId);
        return (cert.institutionId, cert.dataHash, cert.fileCid, cert.timestamp, cert.issuedBy, cert.isValid);
    }

    function getInstitution(uint256 institutionId)
        external
        view
        returns (string memory name, string memory metadataCid, address admin, bool active)
    {
        Institution storage inst = _institutions[institutionId];
        if (!inst.exists) revert InstitutionNotFound(institutionId);
        return (inst.name, inst.metadataCid, inst.admin, inst.active);
    }

    function isIssuer(uint256 institutionId, address account) external view returns (bool) {
        return hasRole(issuerRole(institutionId), account);
    }
}
