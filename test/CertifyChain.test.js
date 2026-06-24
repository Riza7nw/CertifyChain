// test/CertifyChain.test.js
// Contoh test sederhana memakai Hardhat + Chai + ethers v6.
// Jalankan dengan: npx hardhat test

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertifyChain", function () {
  let certifyChain;
  let owner;     // admin/penerbit
  let other;     // akun non-owner (untuk uji akses)
  let recipient;

  // ID & hash contoh
  const certificateId = ethers.id("CERT-2026-0001"); // keccak256("CERT-2026-0001") -> bytes32
  const recipientName = "Budi Santoso";
  const issuerName = "Universitas Blockchain Indonesia";
  let dataHash;

  beforeEach(async function () {
    [owner, other, recipient] = await ethers.getSigners();
    dataHash = ethers.id("isi-dokumen-sertifikat-budi");

    const CertifyChain = await ethers.getContractFactory("CertifyChain");
    certifyChain = await CertifyChain.deploy();
    await certifyChain.waitForDeployment();
  });

  it("deployer menjadi owner", async function () {
    expect(await certifyChain.owner()).to.equal(owner.address);
  });

  it("owner bisa menerbitkan sertifikat & meng-emit event", async function () {
    await expect(
      certifyChain.issueCertificate(certificateId, recipientName, issuerName, dataHash)
    )
      .to.emit(certifyChain, "CertificateIssued")
      .withArgs(
        certificateId,
        owner.address,
        recipientName,
        issuerName,
        dataHash,
        anyValue => true // timestamp dinamis -> cukup pastikan event keluar
      );

    expect(await certifyChain.totalCertificates()).to.equal(1n);
  });

  it("non-owner TIDAK bisa menerbitkan sertifikat", async function () {
    await expect(
      certifyChain
        .connect(other)
        .issueCertificate(certificateId, recipientName, issuerName, dataHash)
    ).to.be.revertedWithCustomError(certifyChain, "NotOwner");
  });

  it("tidak boleh menerbitkan ID yang sama dua kali", async function () {
    await certifyChain.issueCertificate(certificateId, recipientName, issuerName, dataHash);
    await expect(
      certifyChain.issueCertificate(certificateId, recipientName, issuerName, dataHash)
    ).to.be.revertedWithCustomError(certifyChain, "CertificateAlreadyExists");
  });

  it("verifyCertificate mengembalikan true untuk sertifikat aktif", async function () {
    await certifyChain.issueCertificate(certificateId, recipientName, issuerName, dataHash);
    expect(await certifyChain.verifyCertificate(certificateId)).to.equal(true);
  });

  it("getCertificate mengembalikan data yang benar", async function () {
    await certifyChain.issueCertificate(certificateId, recipientName, issuerName, dataHash);

    const cert = await certifyChain.getCertificate(certificateId);
    expect(cert.recipientName).to.equal(recipientName);
    expect(cert.issuerName).to.equal(issuerName);
    expect(cert.dataHash).to.equal(dataHash);
    expect(cert.isValid).to.equal(true);
    expect(cert.timestamp).to.be.greaterThan(0n);
  });

  it("getCertificate revert untuk ID yang tidak ada", async function () {
    await expect(
      certifyChain.getCertificate(ethers.id("TIDAK-ADA"))
    ).to.be.revertedWithCustomError(certifyChain, "CertificateNotFound");
  });

  it("owner bisa mencabut sertifikat -> verify jadi false", async function () {
    await certifyChain.issueCertificate(certificateId, recipientName, issuerName, dataHash);

    await expect(certifyChain.revokeCertificate(certificateId))
      .to.emit(certifyChain, "CertificateRevoked");

    expect(await certifyChain.verifyCertificate(certificateId)).to.equal(false);
  });

  it("verifyCertificateWithHash hanya true jika hash cocok", async function () {
    await certifyChain.issueCertificate(certificateId, recipientName, issuerName, dataHash);

    expect(await certifyChain.verifyCertificateWithHash(certificateId, dataHash)).to.equal(true);
    expect(
      await certifyChain.verifyCertificateWithHash(certificateId, ethers.id("hash-palsu"))
    ).to.equal(false);
  });
});
