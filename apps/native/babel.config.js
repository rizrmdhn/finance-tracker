module.exports = (api) => ({
	presets: ["babel-preset-expo"],
	plugins: [["inline-import", { extensions: [".sql"] }]],
});
