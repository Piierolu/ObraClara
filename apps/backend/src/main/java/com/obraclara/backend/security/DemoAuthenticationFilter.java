package com.obraclara.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/** Demo-only token authentication, intentionally isolated so production identity can replace this filter. */
@Component
public class DemoAuthenticationFilter extends OncePerRequestFilter {
    private static final Map<String, DemoPrincipal> TOKENS = Map.of(
            "demo-admin", new DemoPrincipal("00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000001", "Ana Demo", "ADMIN"),
            "demo-reviewer", new DemoPrincipal("00000000-0000-0000-0000-000000000003", "00000000-0000-0000-0000-000000000001", "Rafael Revisor", "REVIEWER")
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = request.getHeader("X-Demo-Token");
        String authorization = request.getHeader("Authorization");
        if (token == null && authorization != null && authorization.startsWith("Bearer ")) {
            token = authorization.substring(7);
        }
        DemoPrincipal principal = token == null ? null : TOKENS.get(token);
        if (principal != null) {
            var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + principal.role()));
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, token, authorities));
        }
        chain.doFilter(request, response);
    }
}
