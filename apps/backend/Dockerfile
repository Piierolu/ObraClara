FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY apps/backend/pom.xml apps/backend/pom.xml
COPY contracts/proto contracts/proto
COPY apps/backend/src apps/backend/src
RUN mvn -f apps/backend/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 obraclara && mkdir -p /data/uploads && chown -R obraclara /data
USER obraclara
COPY --from=build /workspace/apps/backend/target/backend-*.jar /app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
