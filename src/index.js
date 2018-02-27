import _ from 'lodash';
import indentString from 'indent-string';
import colorsTemplate from './templates/colors.mustache';
import textStylesTemplate from './templates/textStyles.mustache';
import textBlockTemplate from './templates/textBlock.mustache';
import resourceDictionaryTemplate from './templates/resourceDictionary.mustache';

function xamlColorHex(color) {
    const hex = color.toHex();
    const a = Math.round(color.a * 255).toString(16);
    const r = hex.r;
    const g = hex.g;
    const b = hex.b;
    return ('#' + a + r + g + b).toUpperCase();
}

function xamlColorLiteral(context, color) {
    const colorResource = context.project.findColorEqual(color);
    return colorResource ?
        `{StaticResource ${colorResource.name}Brush}` : xamlColorHex(color);
}

function xamlColor(color) {
    return {
        key: color.name,
        color: xamlColorHex(color)
    };
}

function xamlSolidColorBrush(color) {
    return {
        key: `${color.name}Brush`,
        color: `{StaticResource ${color.name}}`
    };
}

function xamlFontWeight(fontWeight) {
    switch (fontWeight) {
        case 100: return 'Thin';
        case 200: return 'ExtraLight';
        case 300: return 'Light';
        case 350: return 'SemiLight';
        case 400: return 'Normal';
        case 500: return 'Medium';
        case 600: return 'SemiBold';
        case 700: return 'Bold';
        case 800: return 'ExtraBold';
        case 900: return 'Black';
        case 950: return 'ExtraBlack';
        default: return 'Normal';
    }
}

function xamlCharacterSpacing(letterSpacing) {
    // LetterSpacing is in points
    // CharacterSpacing is in units of 1/1000 of an em
    // 1 em = 12 points
    return Math.round(letterSpacing / 12 * 1000);
}

function xamlStyle(context, textStyle) {
    const ignoreCharacterSpacing = context.getOption('ignoreCharacterSpacing');
    const ignoreLineHeight = context.getOption('ignoreLineHeight');
    const textAlignmentMode = context.getOption('textAlignmentMode');
    const hasTextAlignment = textAlignmentMode === 'style';
    const defaultFontFamily = context.getOption('defaultFontFamily');
    const isDefaultFontFamily = textStyle.fontFamily === defaultFontFamily;
    const foreground = textStyle.color && xamlColorLiteral(context, textStyle.color);

    return {
        key: textStyle.name,
        style: textStyle.name,
        foreground: foreground,
        fontFamily: !isDefaultFontFamily && textStyle.fontFamily,
        fontSize: _.round(textStyle.fontSize, 2),
        characterSpacing: !ignoreCharacterSpacing && xamlCharacterSpacing(textStyle.letterSpacing),
        fontStyle: _.capitalize(textStyle.fontStyle),
        fontWeight: xamlFontWeight(textStyle.fontWeight),
        lineHeight: !ignoreLineHeight && _.round(textStyle.lineHeight, 2),
        textAlignment: hasTextAlignment && _.capitalize(textStyle.textAlign),
    };
}

function xamlTextBlock(context, textLayer) {
    const textAlignmentMode = context.getOption('textAlignmentMode');
    const hasTextAlignment = textAlignmentMode === 'textBlock';
    const textStyle = textLayer.textStyles[0].textStyle;
    const textStyleResource = context.project.findTextStyleEqual(textStyle);
    const textBlock = textStyleResource ?
        { style: textStyleResource.name } : xamlStyle(context, textStyle);

    textBlock.text = textLayer.content;
    textBlock.textAlignment = hasTextAlignment && _.capitalize(textStyle.textAlign);

    return textBlock;
}

function comment(context, text) {
    return text;
}

function styleguideColors(context, colors) {
    const sortResources = context.getOption('sortResources');
    const colorsFilter = context.getOption('colorsFilter');

    if (sortResources) {
        colors = _.sortBy(colors, 'name');
    }

    if (colorsFilter) {
        const regex = new RegExp(colorsFilter);
        colors = colors.filter(color => regex.test(color.name));
    }

    const code = colorsTemplate({
        colors: colors.map(xamlColor),
        solidColorBrushes: colors.map(xamlSolidColorBrush)
    });

    return {
        code,
        language: 'xml',
    };
}

function styleguideTextStyles(context, textStyles) {
    const sortResources = context.getOption('sortResources');
    const textStylesFilter = context.getOption('textStylesFilter');
    if (sortResources) {
        textStyles = _.sortBy(textStyles, 'name');
    }

    if (textStylesFilter) {
        const regex = new RegExp(textStylesFilter);
        textStyles = textStyles.filter(textStyle => regex.test(textStyle.name));
    }

    const code = textStylesTemplate({
        styles: textStyles.map(textStyle => xamlStyle(context, textStyle))
    });

    return {
        code,
        language: 'xml',
    };
}

function exportStyleguideColors(context, colors) {
    var resources = indentString(styleguideColors(context, colors).code, 4);
    var resourceDictionary = resourceDictionaryTemplate({ resources });

    return {
        code: resourceDictionary,
        language: 'xml',
        filename: 'Colors.xaml'
    };
}

function exportStyleguideTextStyles(context, textStyles) {
    var resources = indentString(styleguideTextStyles(context, textStyles).code, 4);
    var resourceDictionary = resourceDictionaryTemplate({ resources });

    return {
        code: resourceDictionary,
        language: 'xml',
        filename: 'TextBlock.xaml'
    };
}

function layer(context, selectedLayer) {
    if (selectedLayer.type === 'text') {
        const textBlock = xamlTextBlock(context, selectedLayer);
        const code = textBlockTemplate(textBlock);

        return {
            code,
            language: 'xml',
        };
    }
}

const extension = {
    comment,
    styleguideColors,
    styleguideTextStyles,
    exportStyleguideColors,
    exportStyleguideTextStyles,
    layer,
}

export default extension;