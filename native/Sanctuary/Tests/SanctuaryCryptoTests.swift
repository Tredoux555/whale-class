import XCTest
import Sodium
@testable import Sanctuary

/// THE PARITY PROOF. Loads the shared `vectors.json` (a copy of
/// `lib/sanctuary-e2e/vectors.json`) and asserts the Swift crypto reproduces the
/// reference (libsodium-wrappers-sumo) output byte-for-byte. All green = the
/// device crypto is identical to the server contract.
final class SanctuaryCryptoTests: XCTestCase {

    struct Vectors: Decodable {
        struct Input: Decodable {
            let password_utf8: String
            let salt_hex: String
            let nonce_hex: String
            let plaintext_utf8: String
        }
        struct Expected: Decodable {
            let master_hex: String
            let contentKey_hex: String
            let authSecret_hex: String
            let authSecret_b64: String
            let verifier_hex: String
            let verifier_b64: String
            let wire: String
        }
        let input: Input
        let expected: Expected
    }

    private func loadVectors() throws -> Vectors {
        let bundle = Bundle(for: type(of: self))
        guard let url = bundle.url(forResource: "vectors", withExtension: "json") else {
            XCTFail("vectors.json missing from the test bundle (add Tests/vectors.json to the test target resources)")
            throw NSError(domain: "test", code: 1)
        }
        return try JSONDecoder().decode(Vectors.self, from: Data(contentsOf: url))
    }

    func testKnownAnswerVectors() throws {
        let v = try loadVectors()
        let sodium = Sodium()
        let salt = sodium.utils.hex2bin(v.input.salt_hex)!
        let nonce = sodium.utils.hex2bin(v.input.nonce_hex)!

        let master = try SanctuaryCrypto.deriveMaster(password: v.input.password_utf8, salt: salt)
        XCTAssertEqual(SanctuaryCrypto.hex(master), v.expected.master_hex, "Argon2id master mismatch")

        let contentKey = try SanctuaryCrypto.deriveContentKey(master: master)
        XCTAssertEqual(SanctuaryCrypto.hex(contentKey), v.expected.contentKey_hex, "contentKey mismatch")

        let authSecret = try SanctuaryCrypto.deriveAuthSecret(master: master)
        XCTAssertEqual(SanctuaryCrypto.hex(authSecret), v.expected.authSecret_hex, "authSecret hex mismatch")
        XCTAssertEqual(SanctuaryCrypto.b64(authSecret), v.expected.authSecret_b64, "authSecret b64 mismatch")

        let verifier = try SanctuaryCrypto.authVerifier(authSecret: authSecret)
        XCTAssertEqual(SanctuaryCrypto.hex(verifier), v.expected.verifier_hex, "verifier hex mismatch")
        XCTAssertEqual(SanctuaryCrypto.b64(verifier), v.expected.verifier_b64, "verifier b64 mismatch")

        let wire = try SanctuaryCrypto.encrypt(plaintext: v.input.plaintext_utf8, contentKey: contentKey, nonce: nonce)
        XCTAssertEqual(wire, v.expected.wire, "ciphertext wire mismatch")

        let roundTrip = SanctuaryCrypto.decrypt(wire: v.expected.wire, contentKey: contentKey)
        XCTAssertEqual(roundTrip, v.input.plaintext_utf8, "decrypt did not recover the plaintext")

        XCTAssertTrue(SanctuaryCrypto.verifyAuthSecret(authSecret: authSecret, verifier: verifier), "verifier accept failed")
    }

    func testFailsClosed() throws {
        let v = try loadVectors()
        let sodium = Sodium()
        let salt = sodium.utils.hex2bin(v.input.salt_hex)!
        let master = try SanctuaryCrypto.deriveMaster(password: v.input.password_utf8, salt: salt)
        let contentKey = try SanctuaryCrypto.deriveContentKey(master: master)

        // Wrong key → sentinel
        let wrongKey = try SanctuaryCrypto.deriveContentKey(
            master: try SanctuaryCrypto.deriveMaster(password: "a different password", salt: SanctuaryCrypto.randomSalt())
        )
        XCTAssertEqual(SanctuaryCrypto.decrypt(wire: v.expected.wire, contentKey: wrongKey),
                       SanctuaryCrypto.decryptFailureSentinel)

        // Tampered ciphertext → sentinel
        let parts = v.expected.wire.split(separator: ".", omittingEmptySubsequences: false).map(String.init)
        var ct = SanctuaryCrypto.unb64(parts[2])!
        ct[ct.count - 1] ^= 0x01
        let tampered = "sb1.\(parts[1]).\(SanctuaryCrypto.b64(ct))"
        XCTAssertEqual(SanctuaryCrypto.decrypt(wire: tampered, contentKey: contentKey),
                       SanctuaryCrypto.decryptFailureSentinel)

        // Malformed wire → sentinel
        XCTAssertEqual(SanctuaryCrypto.decrypt(wire: "garbage", contentKey: contentKey),
                       SanctuaryCrypto.decryptFailureSentinel)
        XCTAssertEqual(SanctuaryCrypto.decrypt(wire: "sb1.onlytwo", contentKey: contentKey),
                       SanctuaryCrypto.decryptFailureSentinel)

        // Round-trip with a fresh random nonce
        let msg = "a quiet line ✍️"
        let freshWire = try SanctuaryCrypto.encrypt(plaintext: msg, contentKey: contentKey)
        XCTAssertEqual(SanctuaryCrypto.decrypt(wire: freshWire, contentKey: contentKey), msg)

        // Wrong authSecret rejected
        let wrongAuth = try SanctuaryCrypto.deriveAuthSecret(
            master: try SanctuaryCrypto.deriveMaster(password: "nope", salt: SanctuaryCrypto.randomSalt())
        )
        let verifier = try SanctuaryCrypto.authVerifier(authSecret: try SanctuaryCrypto.deriveAuthSecret(master: master))
        XCTAssertFalse(SanctuaryCrypto.verifyAuthSecret(authSecret: wrongAuth, verifier: verifier))
    }
}
