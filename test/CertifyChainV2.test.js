// test/CertifyChainV2.test.js
// Test khusus SECURITY LAYER: role enforcement, anti-duplikat, dan pause.
// Jalankan: npx hardhat test

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("CertifyChainV2 — security layer", function () {
  let contract, admin, issuer, attacker;
  const certId = ethers.id("CERT-V2-0001");
  const dataHash = ethers.id("data-rahasia");
  const recipient = "Budi Santoso";
  const issuerName = "Universitas Blockchain Indonesia";

  beforeEach(async function () {
    [admin, issuer, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CertifyChainV2");
    contract = await Factory.deploy(admin.address);
    await contract.waitForDeployment();
  });

  it("admin (ISSUER_ROLE) bisa menerbitkan & mencatat issuedBy", async function () {
    await expect(contract.issueCertificate(certId, recipient, issuerName, dataHash))
      .to.emit(contract, "CertificateIssued")
      .withArgs(certId, admin.address, recipient, issuerName, dataHash, anyValue);

    const cert = await contract.getCertificate(certId);
    expect(cert.issuedBy).to.equal(admin.address);
    expect(await contract.verifyCertificate(certId)).to.equal(true);
  });

  it("akun tanpa ISSUER_ROLE DITOLAK saat issue", async function () {
    await expect(
      contract.connect(attacker).issueCertificate(certId, recipient, issuerName, dataHash)
    ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
  });

  it("admin bisa grant ISSUER_ROLE, lalu issuer baru bisa menerbitkan", async function () {
    const ISSUER_ROLE = await contract.ISSUER_ROLE();
    await contract.grantRole(ISSUER_ROLE, issuer.address);
    expect(await contract.isIssuer(issuer.address)).to.equal(true);

    await expect(contract.connect(issuer).issueCertificate(certId, recipient, issuerName, dataHash)).to
      .not.be.reverted;
  });

  it("non-admin TIDAK bisa grant role", async function () {
    const ISSUER_ROLE = await contract.ISSUER_ROLE();
    await expect(
      contract.connect(attacker).grantRole(ISSUER_ROLE, attacker.address)
    ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
  });

  it("mencegah duplicate certificate", async function () {
    await contract.issueCertificate(certId, recipient, issuerName, dataHash);
    await expect(
      contract.issueCertificate(certId, recipient, issuerName, dataHash)
    ).to.be.revertedWithCustomError(contract, "CertificateAlreadyExists");
  });

  it("pause memblokir penerbitan; unpause memulihkan", async function () {
    await contract.pause();
    await expect(
      contract.issueCertificate(certId, recipient, issuerName, dataHash)
    ).to.be.revertedWithCustomError(contract, "EnforcedPause");

    await contract.unpause();
    await expect(contract.issueCertificate(certId, recipient, issuerName, dataHash)).to.not.be.reverted;
  });

  it("verifikasi bersifat publik (akun mana pun bisa membaca)", async function () {
    await contract.issueCertificate(certId, recipient, issuerName, dataHash);
    expect(await contract.connect(attacker).verifyCertificate(certId)).to.equal(true);
    expect(await contract.connect(attacker).verifyCertificateWithHash(certId, dataHash)).to.equal(true);
  });
});
