package com.vjcloudbank.transaction.config;

// ─────────────────────────────────────────────────────────────────
// JwtUtil.java — JWT token verification
//
// This is the Java version of the same JWT logic we wrote in
// Node.js (jsonwebtoken) and Python (python-jose).
// Same concept, different language:
//   1. Extract the token from "Authorization: Bearer <token>"
//   2. Verify the signature using our shared secret
//   3. Extract userId, email, role from the payload
// ─────────────────────────────────────────────────────────────────

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
public class JwtUtil {

    // @Value reads from application.properties: jwt.secret=${JWT_SECRET}
    @Value("${jwt.secret}")
    private String jwtSecret;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Verify the token and extract all claims (payload data).
     * Throws an exception if token is invalid or expired.
     */
    public Claims validateToken(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    /**
     * Extract the userId from the token payload.
     * Our User Service puts userId in the "userId" claim.
     */
    public UUID getUserIdFromToken(String token) {
        Claims claims = validateToken(token);
        return UUID.fromString(claims.get("userId", String.class));
    }

    /**
     * Extract the email from the token payload.
     */
    public String getEmailFromToken(String token) {
        Claims claims = validateToken(token);
        return claims.get("email", String.class);
    }

    /**
     * Extract just the token string from the Authorization header.
     * Header format: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     */
    public String extractTokenFromHeader(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7); // Remove "Bearer " prefix
        }
        return null;
    }
}
