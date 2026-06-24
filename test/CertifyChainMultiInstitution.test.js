// test/CertifyChainMultiInstitution.test.js
// Test arsitektur multi-institusi + penyimpanan CID.

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("CertifyChainMultiInstitution (V3)", function () {
  let contract, platform, instAdminA, issuerA, instAdminB, outsider;
  const certId = ethers.id("CERT-A-001");
  const dataHash = ethers.id("data-kanonik-A");
  const fileCid = "bafybeigdyrTESTcidexampleabcdefghijklmnopqrstuvwxyz1234567";

  beforeEach(async function () {
    [platform, instAdminA, issuerA, instAdminB, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CertifyChainMultiInstitution");
    contract = await Factory.deploy(platform.address);
    await contract.waitForDeployment();
  });

  async function registerA() {
    const tx = await contract.registerInstitution(instAdminA.address, "Universitas A", "bafymeta-A");
    await tx.wait();
    return 1n; // institutionId pertama
  }

  it("hanya PLATFORM admin yang bisa mendaftarkan institusi", async function () {
    await expect(
      contract.connect(outsider).registerInstitution(instAdminA.address, "X", "")
    ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");

    await expect(contract.registerInstitution(instAdminA.address, "Universitas A", "bafymeta-A"))
      .to.emit(contract, "InstitutionRegistered")
      .withArgs(1n, instAdminA.address, "Universitas A", "bafymeta-A");
  });

  it("admin institusi bisa menambah issuer; issuer itu bisa menerbitkan", async function () {
    const id = await registerA();
    await contract.connect(instAdminA).addIssuer(id, issuerA.address);
    expect(await contract.isIssuer(id, issuerA.address)).to.equal(true);

    await expect(
      contract.connect(issuerA).issueCertificate(id, certId, dataHash, fileCid)
    )
      .to.emit(contract, "CertificateIssued")
      .withArgs(certId, id, issuerA.address, dataHash, fileCid, anyValue);

    const cert = await contract.getCertificate(certId);
    expect(cert.institutionId).to.equal(id);
    expect(cert.fileCid).to.equal(fileCid);
    expect(cert.issuedBy).to.equal(issuerA.address);
  });

  it("akun tanpa issuerRole institusi tsb DITOLAK", async function () {
    const id = await registerA();
    await expect(
      contract.connect(outsider).issueCertificate(id, certId, dataHash, fileCid)
    ).to.be.revertedWithCustomError(contract, "NotIssuer");
  });

  it("ISOLASI: admin institusi B tidak bisa menambah issuer ke institusi A", async function () {
    const idA = await registerA();
    await contract.registerInstitution(instAdminB.address, "Universitas B", ""); // id 2

    // instAdminB bukan admin role institusi A -> grantRole gagal
    await expect(
      contract.connect(instAdminB).addIssuer(idA, outsider.address)
    ).to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount");
  });

  it("mencegah duplicate certificate", async function () {
    const id = await registerA();
    await contract.connect(instAdminA).issueCertificate(id, certId, dataHash, fileCid);
    await expect(
      contract.connect(instAdminA).issueCertificate(id, certId, dataHash, fileCid)
    ).to.be.revertedWithCustomError(contract, "CertificateAlreadyExists");
  });

  it("institusi nonaktif tidak bisa menerbitkan", async function () {
    const id = await registerA();
    await contract.setInstitutionActive(id, false);
    await expect(
      contract.connect(instAdminA).issueCertificate(id, certId, dataHash, fileCid)
    ).to.be.revertedWithCustomError(contract, "InstitutionInactive");
  });

  it("pause platform memblokir semua penerbitan", async function () {
    const id = await registerA();
    await contract.pause();
    await expect(
      contract.connect(instAdminA).issueCertificate(id, certId, dataHash, fileCid)
    ).to.be.revertedWithCustomError(contract, "EnforcedPause");
  });

  it("verifikasi publik + cek hash", async function () {
    const id = await registerA();
    await contract.connect(instAdminA).issueCertificate(id, certId, dataHash, fileCid);
    expect(await contract.connect(outsider).verifyCertificate(certId)).to.equal(true);
    expect(await contract.connect(outsider).verifyCertificateWithHash(certId, dataHash)).to.equal(true);
    expect(await contract.connect(outsider).verifyCertificateWithHash(certId, ethers.id("beda"))).to.equal(false);
  });
});
