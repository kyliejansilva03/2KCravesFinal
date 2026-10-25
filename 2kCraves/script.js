
"use strict";

// =====================================
// THEMEALDB API
// =====================================

const API_BASE = "https://www.themealdb.com/api/json/v1/1";

let currentSearchResults = [];
let myFavorites = loadFavorites();

// =====================================
// LOAD SAVED FAVORITES
// =====================================

function loadFavorites() {
    try {
        const saved = JSON.parse(
            localStorage.getItem("mySavedRecipes") || "[]"
        );

        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        console.error("Unable to load favorites:", error);
        return [];
    }
}

// =====================================
// SAFE TEXT DISPLAY
// =====================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[char];
    });
}

// =====================================
// FETCH RECIPES FROM THEMEALDB
// =====================================

async function fetchMeals(endpoint) {
    const response = await fetch(`${API_BASE}/${endpoint}`);

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    return data.meals || [];
}

// =====================================
// GET INGREDIENTS AND MEASUREMENTS
// =====================================

function getIngredients(meal) {
    const ingredients = [];

    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`]?.trim();
        const measure = meal[`strMeasure${i}`]?.trim();

        if (ingredient) {
            ingredients.push(
                [measure, ingredient].filter(Boolean).join(" ")
            );
        }
    }

    return ingredients;
}

// =====================================
// CONVERT API RECIPE DATA
// =====================================

function convertMeal(meal) {
    return {
        id: String(meal.idMeal),
        name: meal.strMeal || "Untitled Recipe",
        category: meal.strCategory || "Recipe",
        area: meal.strArea || "",
        source: "TheMealDB",
        ingredientSource: "TheMealDB",
        image: meal.strMealThumb || "",
        ingredients: getIngredients(meal),
        instructions:
            meal.strInstructions || "No instructions available.",
        video: meal.strYoutube || "",
        sourceUrl: meal.strSource || ""
    };
}

// =====================================
// PAGE NAVIGATION
// =====================================

function goToPage(pageId) {
    const selectedPage = document.getElementById(pageId);

    if (!selectedPage) {
        return;
    }

    document.querySelectorAll(".page").forEach(function (page) {
        page.hidden = true;
    });

    selectedPage.hidden = false;

    if (pageId === "favorites-page") {
        displayFavorites();
    }
}

// =====================================
// HOME PAGE RECIPES
// =====================================

async function showPopularRecipes() {
    const container = document.getElementById("results");

    container.innerHTML = `
        <h2 class="section-title">SIKAT RECIPES!</h2>
        <p class="loading-message">Loading delicious recipes...</p>
    `;

    try {
        // The random.php endpoint returns one recipe per request.
        const responses = await Promise.all(
            Array.from(
                { length: 8 },
                function () {
                    return fetchMeals("random.php");
                }
            )
        );

        const uniqueMeals = new Map();

        responses.flat().forEach(function (meal) {
            if (meal && meal.idMeal) {
                uniqueMeals.set(
                    String(meal.idMeal),
                    convertMeal(meal)
                );
            }
        });

        currentSearchResults = Array.from(uniqueMeals.values());

        if (currentSearchResults.length === 0) {
            showMessage(
                container,
                "No recipes found.",
                "Please try again later."
            );
            return;
        }

        renderRecipeList(
            currentSearchResults,
            container,
            "SIKAT RECIPES!"
        );

    } catch (error) {
        console.error("Error loading recipes:", error);

        showMessage(
            container,
            "Unable to load recipes.",
            "Please check your internet connection and try again.",
            true
        );
    }
}

// =====================================
// SEARCH RECIPE
// =====================================

async function searchRecipe() {
    const input = document.getElementById("searchInput");
    const query = input.value.trim();
    const container = document.getElementById("results");

    goToPage("home-page");

    if (!query) {
        await showPopularRecipes();
        return;
    }

    container.innerHTML = `
        <h2 class="section-title">SEARCH RESULTS</h2>
        <p class="loading-message">Searching recipes...</p>
    `;

    try {
        const meals = await fetchMeals(
            `search.php?s=${encodeURIComponent(query)}`
        );

        currentSearchResults = meals.map(convertMeal);

        if (currentSearchResults.length === 0) {
            showMessage(
                container,
                "No recipe found.",
                "Try another meal name, such as chicken, pasta, or curry."
            );
            return;
        }

        renderRecipeList(
            currentSearchResults,
            container,
            `RESULTS FOR "${query}"`
        );

    } catch (error) {
        console.error("Error searching recipes:", error);

        showMessage(
            container,
            "Unable to search for recipes.",
            "Check your internet connection and try again.",
            true
        );
    }
}

// =====================================
// DISPLAY RECIPE CARDS
// =====================================

function renderRecipeList(recipes, container, heading) {
    container.innerHTML = `
        <h2 class="section-title">${escapeHTML(heading)}</h2>
        <div class="recipe-list"></div>
    `;

    const list = container.querySelector(".recipe-list");

    recipes.forEach(function (recipe) {
        list.appendChild(createRecipeCard(recipe));
    });
}

function createRecipeCard(recipe) {
    const card = document.createElement("div");
    card.className = "recipe-card";

    const isFavorite = myFavorites.some(function (favorite) {
        return favorite.id === recipe.id;
    });

    const imageHTML = recipe.image
        ? `
            <img
                class="recipe-photo"
                src="${escapeHTML(recipe.image)}"
                alt="${escapeHTML(recipe.name)}"
                loading="lazy"
            >
        `
        : `<div class="recipe-image-placeholder">🍽️</div>`;

    const ingredientsHTML = recipe.ingredients.length
        ? recipe.ingredients.map(function (ingredient) {
            return `<li>${escapeHTML(ingredient)}</li>`;
        }).join("")
        : "<li>No ingredients listed.</li>";

    const instructionsHTML = escapeHTML(recipe.instructions)
        .replace(/\r\n|\r|\n/g, "<br>");

    card.innerHTML = `
        <div class="recipe-icon">
            ${imageHTML}
        </div>

        <div class="recipe-details">
            <h3>${escapeHTML(recipe.name)}</h3>

            <span class="recipe-category">
                ${escapeHTML(recipe.category)}
            </span>

            ${
                recipe.area
                    ? `<p class="recipe-area">
                        Cuisine: ${escapeHTML(recipe.area)}
                       </p>`
                    : ""
            }

            <p class="recipe-source">
                Recipe Source: <strong>TheMealDB</strong>
            </p>

            <h4>Ingredients 🥄</h4>

            <ul class="ingredients">
                ${ingredientsHTML}
            </ul>

            <p class="ingredient-source">
                Ingredient Source: <strong>TheMealDB</strong>
            </p>

            <h4>How to Cook 👩‍🍳</h4>

            <p class="instructions">${instructionsHTML}</p>

            <button
                type="button"
                class="fav-btn"
                data-recipe-id="${escapeHTML(recipe.id)}"
            >
                ${isFavorite ? "★ Remove Favorite" : "♡ Add to Favorites"}
            </button>
        </div>
    `;

    const image = card.querySelector(".recipe-photo");

    if (image) {
        image.addEventListener("error", function () {
            const placeholder = document.createElement("div");

            placeholder.className = "recipe-image-placeholder";
            placeholder.textContent = "🍽️";

            image.replaceWith(placeholder);
        });
    }

    // Click the food picture or recipe name to open the recipe
    card.querySelector(".recipe-icon").addEventListener("click", function () {
        openRecipeModal(recipe);
    });

    card.querySelector(".recipe-details h3").addEventListener("click", function () {
        openRecipeModal(recipe);
    });

    card.querySelector(".fav-btn").addEventListener("click", function () {
        toggleFavorite(recipe.id);
    });

    return card;
}

// =====================================
// SAVE FAVORITES
// =====================================

function saveFavorites() {
    try {
        localStorage.setItem(
            "mySavedRecipes",
            JSON.stringify(myFavorites)
        );

        return true;

    } catch (error) {
        console.error("Unable to save favorites:", error);

        alert(
            "Unable to save favorites. Please check your browser storage."
        );

        return false;
    }
}

// =====================================
// ADD OR REMOVE FAVORITES
// =====================================

function toggleFavorite(recipeId) {
    const id = String(recipeId);

    const existingIndex = myFavorites.findIndex(function (recipe) {
        return recipe.id === id;
    });

    const previousFavorites = [...myFavorites];

    if (existingIndex !== -1) {
        myFavorites.splice(existingIndex, 1);

    } else {
        const recipe = currentSearchResults.find(function (item) {
            return item.id === id;
        });

        if (!recipe) {
            return;
        }

        myFavorites.push(recipe);
    }

    if (!saveFavorites()) {
        myFavorites = previousFavorites;
        return;
    }

    displayFavorites();

    const homePage = document.getElementById("home-page");

    if (!homePage.hidden) {
        const container = document.getElementById("results");
        const heading = container.querySelector(".section-title");

        renderRecipeList(
            currentSearchResults,
            container,
            heading ? heading.textContent : "SIKAT RECIPES!"
        );
    }
}

// =====================================
// DISPLAY FAVORITES PAGE
// =====================================

function displayFavorites() {
    const container = document.getElementById("favorites-list");

    container.innerHTML = "";

    if (myFavorites.length === 0) {
        showMessage(
            container,
            "No favorite recipes yet.",
            'Click "♡ Add to Favorites" on a recipe to save it here.'
        );

        return;
    }

    renderRecipeList(
        myFavorites,
        container,
        "YOUR FAVORITE RECIPES"
    );
}

// =====================================
// EMPTY RESULTS AND ERROR MESSAGES
// =====================================

function showMessage(container, title, message, isError = false) {
    container.innerHTML = `
        <div class="no-results">
            <div class="empty-icon">${isError ? "😿" : "🍽️"}</div>

            <h3>${escapeHTML(title)}</h3>

            <p>${escapeHTML(message)}</p>

            ${
                isError
                    ? `<button type="button" class="fav-btn retry-btn">
                        Try Again
                       </button>`
                    : ""
            }
        </div>
    `;

    const retryButton = container.querySelector(".retry-btn");

    if (retryButton) {
        retryButton.addEventListener("click", showPopularRecipes);
    }
}

// =====================================
// START WEBSITE
// =====================================

document.addEventListener("DOMContentLoaded", function () {
    const searchForm = document.getElementById("searchForm");

    searchForm.addEventListener("submit", function (event) {
        event.preventDefault();
        searchRecipe();
    });

    showPopularRecipes();
});

document.addEventListener("DOMContentLoaded", function () {
    goToPage("home-page");
});

/* =====================================
   CLICKABLE RECIPE POPUP
===================================== */

function openRecipeModal(recipe) {
    const modal = document.getElementById("recipeModal");
    const image = document.getElementById("modalRecipeImage");

    document.getElementById("modalRecipeName").textContent = recipe.name;
    document.getElementById("modalRecipeCategory").textContent =
        [recipe.category, recipe.area].filter(Boolean).join(" • ");

    image.src = recipe.image || "";
    image.alt = recipe.name;
    image.hidden = !recipe.image;

    const ingredientsList = document.getElementById("modalRecipeIngredients");
    ingredientsList.replaceChildren();

    if (recipe.ingredients.length) {
        recipe.ingredients.forEach(function (ingredient) {
            const item = document.createElement("li");
            item.textContent = ingredient;
            ingredientsList.appendChild(item);
        });
    } else {
        const item = document.createElement("li");
        item.textContent = "No ingredients listed.";
        ingredientsList.appendChild(item);
    }

    document.getElementById("modalRecipeInstructions").textContent =
        recipe.instructions || "No cooking instructions available.";

    modal.hidden = false;
    document.body.style.overflow = "hidden";
}

function closeRecipeModal() {
    document.getElementById("recipeModal").hidden = true;
    document.body.style.overflow = "";
}

document.getElementById("closeRecipeModal").addEventListener("click", closeRecipeModal);

document.getElementById("recipeModal").addEventListener("click", function (event) {
    if (event.target.id === "recipeModal") {
        closeRecipeModal();
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeRecipeModal();
    }
});
