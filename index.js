const fetch = require("node-fetch");
const fs = require("fs");
const DomParser = require('dom-parser');
const parser = new DomParser();

(async function main () {
	for (let i = 1; i <= 15; i++) {
		await fetchRecipes(i);
		console.log(`Page ${i} of 15`);
	}
})();

async function fetchRecipes(i) {
	await fetch(`https://www.shugarysweets.com/wp-json/wp/v2/posts?page=${i}&per_page=100`, {
		"headers": {
		"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
		"accept-language": "en-US,en;q=0.9",
		"cache-control": "max-age=0",
		"sec-ch-ua": "\"Chromium\";v=\"111\", \"Not(A:Brand\";v=\"8\"",
		"sec-ch-ua-mobile": "?0",
		"sec-ch-ua-platform": "\"macOS\"",
		"sec-fetch-dest": "document",
		"sec-fetch-mode": "navigate",
		"sec-fetch-site": "none",
		"sec-fetch-user": "?1",
		"upgrade-insecure-requests": "1"
		},
		"referrerPolicy": "strict-origin-when-cross-origin",
		"body": null,
		"method": "GET",
		"mode": "cors",
		"credentials": "include"
	}).then(res => res.json()).then(json => parseRecipes(json));
}

function parseDuration(durationString) {
	const regex = /^PT(?:(\d+)H)?(?:(\d+)M)?$/;
	const matches = durationString.match(regex);
	const hours = matches[1] ? parseInt(matches[1]) : 0;
	const minutes = matches[2] ? parseInt(matches[2]) : 0;
	if (hours == 0) {
		if (minutes == 1) {
			return `${minutes} minute`
		}
		return `${minutes} minutes`
	} else if (minutes == 0) {
		if (hours == 1) {
			return `${hours} hour`
		}
		return `${hours} hours`
	} else {
		if (hours == 1 && minutes == 1) {
			return `${hours} hour ${minutes} minute`
		} else if (hours == 1) {
			return `${hours} hour ${minutes} minutes`
		} else if (minutes == 1) {
			return `${hours} hours ${minutes} minute`
		}
		return `${hours} hours ${minutes} minutes`
	}
}
  
  

async function parseRecipes(recipes) {
	for (let i = 0; i < recipes.length; i++) {
		try {
			const data = await fetchRecipe(recipes[i].id);
			const dom = parser.parseFromString(data.content.rendered);
			const parsedData = JSON.parse(dom.getElementsByTagName('script')[0].textContent.match(/({[\s\S]*})/)[0]);
			const duplicateNutrition = Object.assign({}, parsedData.nutrition);
			delete duplicateNutrition['@type'];
			delete duplicateNutrition['servingSize'];
			recipe = {
				title: parsedData.name,
				image: recipes[i].yoast_head_json.og_image[0].url,
				description: parsedData.description,
				serves: parsedData.recipeYield,
				date: parsedData.datePublished,
				macros: {
					"Calories": parsedData.nutrition.calories.match(/^[^\d]*(\d+)/)[0],
					"Protein": parsedData.nutrition.proteinContent.match(/^[^\d]*(\d+)/)[0],
					"Carbohydrate": parsedData.nutrition.carbohydrateContent.match(/^[^\d]*(\d+)/)[0],
					"Fat": parsedData.nutrition.fatContent.match(/^[^\d]*(\d+)/)[0],
					"Fiber": parsedData.nutrition.fiberContent.match(/^[^\d]*(\d+)/)[0],
				},
				nutrition: Object.values(duplicateNutrition),
				ingredients: parsedData.recipeIngredient,
				instructions: parsedData.recipeInstructions.map(e => e.text),
				categories: [parsedData.recipeCategory, parsedData.recipeCuisine],
				prepTime: parseDuration(parsedData.prepTime),
				time: parseDuration(parsedData.totalTime),
			}
			createMd(recipe);
			console.log(`Recipe ${i + 1} of ${recipes.length}`);
		} catch (err) {
			console.log(err);
			console.log(`Recipe ${i + 1} of ${recipes.length}`);
		}
	}
	return
}

function fetchRecipe(recipeId) {
	return new Promise((resolve) => {
		fetch(`https://www.shugarysweets.com/wp-json/wp/v2/posts/${recipeId}`, {
		"headers": {
			"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
			"accept-language": "en-US,en;q=0.9",
			"cache-control": "max-age=0",
			"sec-ch-ua": "\"Chromium\";v=\"111\", \"Not(A:Brand\";v=\"8\"",
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"macOS\"",
			"sec-fetch-dest": "document",
			"sec-fetch-mode": "navigate",
			"sec-fetch-site": "none",
			"sec-fetch-user": "?1",
			"upgrade-insecure-requests": "1"
		},
		"referrerPolicy": "strict-origin-when-cross-origin",
		"body": null,
		"method": "GET",
		"mode": "cors",
		"credentials": "include"
		}).then(res => res.json()).then(data => resolve(data));
	});
}

function createMd(recipe) {
	recipe.title = recipe.title.replace(/["']/g, "")

	const markdown = `---
layout: ../../layouts/MarkdownPostLayout.astro
title: ${recipe.title}
author: ShugarySweets
pubDate: ${recipe.date}
description: "${recipe.description.replace(/["']/g, "")}"
image_url: ${recipe.image}
tags: ${JSON.stringify(recipe.categories)}
calories: ${recipe.macros == undefined || recipe.macros["Calories"] == undefined ? "" : recipe.macros["Calories"]}
protein: ${recipe.macros == undefined || recipe.macros["Protein"] == undefined ? "" : recipe.macros["Protein"]}
carbohydrates: ${recipe.macros == undefined || recipe.macros["Carbohydrate"] == undefined ? "" : recipe.macros["Carbohydrate"]}
fats: ${recipe.macros == undefined || recipe.macros["Fat"] == undefined ? "" : recipe.macros["Fat"]}
fiber: ${recipe.macros == undefined || recipe.macros["Fiber"] == undefined ? "" : recipe.macros["Fiber"]}
ingredients: ${JSON.stringify(recipe.ingredients)}
serves: ${recipe.serves == undefined ? "" : recipe.serves}
time: "${recipe.time == undefined || recipe.time == null ? "" : recipe.time}"
prepTime: "${recipe.prepTime == undefined || recipe.prepTime == null ? "" : recipe.prepTime}"
instructions: ${JSON.stringify(recipe.instructions)}
nutrition: ${JSON.stringify(recipe.nutrition)}
---`

	let newTitle = recipe.title.replace(/[^a-z0-9]/gi, ' ')
	newTitle = newTitle.replace(/\s+/g,' ').trim();

	fs.writeFileSync(`./recipes/${newTitle}.md`, markdown.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
	console.log(`\x1b[32mCreated ${recipe.title}.md\x1b[0m`)
	return
}