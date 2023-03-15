module.exports = function (api) {
    api.cache(true);
    const presets = [
        ['@babel/preset-react', {
            targets: { esmodules: false, node: "current" }
        }]
    ]
    const plugins = [];
    return {
        presets,
        plugins
    };
}
