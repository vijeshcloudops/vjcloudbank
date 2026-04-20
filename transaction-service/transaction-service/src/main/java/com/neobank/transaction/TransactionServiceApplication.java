package com.vjcloudbank.transaction;

// ─────────────────────────────────────────────────────────────────
// TransactionServiceApplication.java
//
// This is the entry point of the Spring Boot application.
// @SpringBootApplication does three things:
//   1. @Configuration — marks this as a config class
//   2. @EnableAutoConfiguration — auto-configures Spring based
//      on what's in your classpath (finds JPA, Web etc.)
//   3. @ComponentScan — scans for @Service, @Controller etc.
//
// SpringApplication.run() starts the embedded Tomcat server
// and the entire application context.
// ─────────────────────────────────────────────────────────────────

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TransactionServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(TransactionServiceApplication.class, args);
    }
}
