// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PrivacyPass {
    address public owner;

    struct Credential {
        address issuer;
        address subject;
        uint256 issuedAt;
        uint256 expiresAt;
        bool revoked;
        bytes32 zkCommitment;
    }

    mapping(bytes32 => Credential) private credentials;
    mapping(address => bool) public authorizedIssuers;

    event CredentialRegistered(
        bytes32 indexed credentialHash,
        address indexed issuer,
        address indexed subject,
        uint256 expiresAt,
        bytes32 zkCommitment
    );

    event CredentialRevoked(
        bytes32 indexed credentialHash,
        address indexed issuer
    );

    event IssuerAuthorizationUpdated(
        address indexed issuer,
        bool allowed
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function authorizeIssuer(address issuer, bool allowed) external onlyOwner {
        authorizedIssuers[issuer] = allowed;
        emit IssuerAuthorizationUpdated(issuer, allowed);
    }

    function registerCredential(
        bytes32 credentialHash,
        address subject,
        uint256 expiresAt,
        bytes32 zkCommitment
    ) external onlyAuthorizedIssuer {
        require(credentials[credentialHash].issuer == address(0), "Already registered");
        require(subject != address(0), "Invalid subject");
        require(expiresAt > block.timestamp, "Invalid expiration");

        credentials[credentialHash] = Credential({
            issuer: msg.sender,
            subject: subject,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            revoked: false,
            zkCommitment: zkCommitment
        });

        emit CredentialRegistered(credentialHash, msg.sender, subject, expiresAt, zkCommitment);
    }

    function revokeCredential(bytes32 credentialHash) external {
        Credential storage cred = credentials[credentialHash];
        require(cred.issuer != address(0), "Unknown credential");
        require(msg.sender == cred.issuer || msg.sender == owner, "Not issuer or owner");
        require(!cred.revoked, "Already revoked");

        cred.revoked = true;
        emit CredentialRevoked(credentialHash, cred.issuer);
    }

    function verifyCredential(
        bytes32 credentialHash
    )
        external
        view
        returns (
            bool valid,
            bool revoked,
            uint256 expiresAt,
            address issuer,
            address subject
        )
    {
        Credential memory cred = credentials[credentialHash];
        if (cred.issuer == address(0)) {
            return (false, false, 0, address(0), address(0));
        }

        bool isExpired = cred.expiresAt <= block.timestamp;
        bool isValid = !cred.revoked && !isExpired;

        return (isValid, cred.revoked, cred.expiresAt, cred.issuer, cred.subject);
    }
}

