package com.obraclara.backend.security;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class DemoAuthController {
    @PostMapping("/demo")
    DemoToken demo() {
        return new DemoToken("demo-admin");
    }

    record DemoToken(String token) {}
}
