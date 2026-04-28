import com.codeborne.selenide.Configuration;

import static com.codeborne.selenide.Condition.text;
import static com.codeborne.selenide.Condition.visible;
import com.codeborne.selenide.SelenideElement;

// import org.openqa.selenium.SelenideElement;
import static com.codeborne.selenide.Selenide.*; // для $ и $(byText)
import static com.codeborne.selenide.Selectors.*; // для byText

import java.util.Random;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

public class piTests {
    @BeforeAll
    static void beforeAll(){
        Configuration.browser = "firefox";
        Configuration.browserSize = "1920x1080";
        Configuration.holdBrowserOpen = true;

    }
    
     @Test
    void registerAlreadyHaveUserTest(){
        open("http://localhost:3000/pages/unautirizPage.html");
        $(".reg-link").click();
        $("#name").setValue("Пётр");
        $("#lastname").setValue("Петров");
        // $("#birthDate").click();
        $("#birthDate").setValue("1995-12-25");
        // actions().sendKeys(Keys.ENTER).perform();
        $("#username").setValue("tt@t.ru");
        $("#password").setValue("qwerty");
        $("#password_2").setValue("qwerty");
        $(".btn-submit").click();
        // $(".sidebar").shouldHave(text("task system"));
        $("#message").shouldHave(text("Пользователь с таким именем уже существует!"));
    }

    @Test
    void registerUser(){
        Random random = new Random();
        int a = random.nextInt(100);
        int b = random.nextInt(100);
        int c = random.nextInt(100);
        String password = "qwerty"+a+b+c;

        open("http://localhost:3000/pages/unautirizPage.html");
        $(".reg-link").click();
        $("#name").setValue("Пётр");
        $("#lastname").setValue("Петров");
        $("#birthDate").setValue("1995-12-25");
        $("#username").setValue("tt"+a+b+c+"@t.ru");
        $("#password").setValue(password);
        $("#password_2").setValue(password);
        $(".btn-submit").click();
        $("#message").shouldHave(text("Регистрация успешна! Переходим..."));
        $("h1").shouldHave(text("Профиль"));
    }

    @Test
    void authTest(){
        open("http://localhost:3000/pages/unautirizPage.html");
        $(".auth-link").click();
        $("#username").setValue("t@t.t");
        $("#password").setValue("123");
        $(".btn-submit").click();
        $("main").shouldHave(text("Профиль"));
    }

    @Test
    void createBacklogTest(){
        open("http://localhost:3000/pages/backlogsPage.html");
        $("#btn-create").click();
        $("#backlogNameInput").setValue("Написать тесты");
        $("#backlogDescriptInput").setValue("Автоматизировать тестирование по максимуму");

        $("#taskPriority").selectOption("Высокий");

        $(".bl-createform-btn").click();
        $("#backlogMaker").shouldHave(text("Написать тесты"));
    }

    @Test
    void createSprintTest(){
        Random random = new Random();
        int a = random.nextInt(100);
        open("http://localhost:3000/pages/backlogsPage.html");
        $("#btn-start").click();
        $("#sprintNameInput").setValue("Спринт " + a);
        $(".sprint-createform-btn").click();
        $("#sprintStarter").shouldHave(text("Спринт " + a));
    }

    @Test
    void dragAndDropBacklogInSprintTest(){
        open("http://localhost:3000/pages/backlogsPage.html");

        SelenideElement draggable = $(byText("Позавтракать")).shouldBe(visible);
        SelenideElement target = $(".sprint-block").shouldBe(visible);

        actions().dragAndDrop(draggable, target).perform();
    }

   
}
