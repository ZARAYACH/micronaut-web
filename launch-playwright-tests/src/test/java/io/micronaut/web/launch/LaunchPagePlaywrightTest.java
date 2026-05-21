package io.micronaut.web.launch;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Download;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.options.AriaRole;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.zip.ZipFile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LaunchPagePlaywrightTest {

    @TempDir
    Path tempDir;

    @Test
    void downloadsJavaGradleProjectFromRealLaunchBackend() throws Exception {
        var baseUrl = System.getProperty("launch.baseUrl");
        var apiBaseUrl = System.getProperty("launch.apiBaseUrl");

        try (var playwright = Playwright.create();
             var browser = launchBrowser(playwright)) {
            var context = browser.newContext(new Browser.NewContextOptions().setAcceptDownloads(true));
            var page = context.newPage();

            page.navigate(baseUrl);
            page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setName("Build a Micronaut project")).waitFor();
            page.getByTestId("build-gradle").click();
            page.getByTestId("lang-java").click();
            page.getByTestId("test-junit").click();
            page.getByTestId("feature-search").fill("management");
            page.getByTestId("feature-management").click();
            page.getByTestId("decision-row-errors").click();
            page.getByTestId("decision-errors-problem-json").click();
            page.getByTestId("decision-row-http-client").click();
            page.getByTestId("decision-http-client-http-client").click();
            page.getByTestId("decision-row-http-client").click();
            page.getByTestId("decision-http-client-http-client-jdk").click();

            var createUrl = page.getByTestId("create-url").inputValue();
            var decodedCreateUrl = URLDecoder.decode(createUrl, StandardCharsets.UTF_8);
            assertTrue(createUrl.startsWith(apiBaseUrl + "/create/default/com.example.demo?"), createUrl);
            assertTrue(createUrl.contains("build=GRADLE"), createUrl);
            assertTrue(createUrl.contains("lang=JAVA"), createUrl);
            assertTrue(createUrl.contains("features="), createUrl);
            assertTrue(decodedCreateUrl.contains("problem-json"), decodedCreateUrl);
            assertTrue(decodedCreateUrl.contains("http-client-jdk"), decodedCreateUrl);
            assertTrue(!decodedCreateUrl.contains("features=http-client,"), decodedCreateUrl);
            assertTrue(!decodedCreateUrl.contains(",http-client,"), decodedCreateUrl);

            Download download = page.waitForDownload(() -> page.getByTestId("download-project").click());
            assertEquals("demo.zip", download.suggestedFilename());
            var zipPath = tempDir.resolve(download.suggestedFilename());
            download.saveAs(zipPath);

            assertGeneratedZip(zipPath);
            context.close();
        }
    }

    private Browser launchBrowser(Playwright playwright) {
        var channel = System.getProperty("launch.browserChannel", "chrome");
        var launchOptions = new BrowserType.LaunchOptions().setHeadless(true);
        var executablePath = Optional.ofNullable(System.getenv("LAUNCH_BROWSER_EXECUTABLE"))
            .map(Path::of)
            .orElse(Path.of("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"));

        if (Files.isExecutable(executablePath)) {
            launchOptions.setExecutablePath(executablePath);
        } else if (!channel.isBlank()) {
            launchOptions.setChannel(channel);
        }

        try {
            return playwright.chromium().launch(launchOptions);
        } catch (RuntimeException browserFailure) {
            Assumptions.abort("Playwright browser could not start: " + browserFailure.getMessage());
            throw browserFailure;
        }
    }

    private void assertGeneratedZip(Path zipPath) throws IOException {
        assertTrue(Files.size(zipPath) > 10_000, "Generated ZIP should contain a real project");
        try (var zip = new ZipFile(zipPath.toFile())) {
            assertNotNull(zip.getEntry("build.gradle"));
            assertNotNull(zip.getEntry("src/main/java/com/example/Application.java"));
            assertNotNull(zip.getEntry("micronaut-cli.yml"));
            var buildGradle = readZipEntry(zip, "build.gradle");
            var cli = readZipEntry(zip, "micronaut-cli.yml");
            assertTrue(buildGradle.contains("io.micronaut:micronaut-management"), buildGradle);
            assertTrue(buildGradle.contains("sourceCompatibility = JavaVersion.toVersion"), buildGradle);
            assertTrue(cli.contains("sourceLanguage: java"), cli);
            assertTrue(cli.contains("buildTool: gradle"), cli);
            assertTrue(cli.contains("management"), cli);
            assertTrue(cli.contains("problem-json"), cli);
            assertTrue(cli.contains("http-client-jdk"), cli);
        }
    }

    private String readZipEntry(ZipFile zip, String name) throws IOException {
        var entry = Optional.ofNullable(zip.getEntry(name)).orElseThrow();
        try (var input = zip.getInputStream(entry)) {
            return new String(input.readAllBytes());
        }
    }
}
