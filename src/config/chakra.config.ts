/**
 * Chakra UI 主题配置文件
 * 定义全局样式、颜色、断点、间距和组件样式
 */

import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

import { styles } from '../theme/styles';

/**
 * 颜色模式配置
 * - initialColorMode: 初始颜色模式为亮色
 * - useSystemColorMode: 不使用系统颜色模式
 */
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

/**
 * 扩展默认主题配置
 */
const theme = extendTheme({
  /**
   * 品牌颜色系统
   * - purple: 主要品牌色（紫色系列）
   * - slate: 中性色系列
   * - grey: 辅助灰色
   * - progress: 进度条颜色
   */
  colors: {
    brand: {
      purple: '#6366F1',
      'purple.light': '#7471ff',
      'purple.dark': '#4F46E5',
      'purple.50': '#EEF2FF',
      'purple.300': '#A5B4FC',
      'purple.400': '#818CF8',
      slate: {
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
      },
      grey: {
        50: '#F7FAFC',
      },
      progress: {
        darkGreen: { 500: '#0D9488' },
        lightGreen: { 500: '#84CC16' },
        lightYellow: { 500: '#FDBA74' },
      },
    },
  },

  /**
   * 响应式断点配置
   * 从小到大定义不同屏幕尺寸的断点
   */
  breakpoints: {
    base: '0em',     // 0px
    xs: '24em',      // 384px
    sm: '30em',      // 480px
    md: '48em',      // 768px
    lg: '62em',      // 992px
    xl: '80em',      // 1280px
    '2xl': '96em',   // 1536px
  },

  /**
   * 自定义间距配置
   * 扩展默认间距系统
   */
  space: {
    85: '21rem',
    120: '46.0625rem',
    brand: {
      85: '21rem',
      120: '46.0625rem',
    },
  },

  // 导入基础配置
  config,
  // 导入全局样式
  styles,

  /**
   * 组件样式覆盖
   * 自定义各个组件的默认样式和变体
   */
  components: {
    /**
     * 开关组件样式
     * 自定义轨道颜色
     */
    Switch: {
      baseStyle: {
        track: {
          bg: 'brand.slate.400',
          _checked: {
            bg: 'brand.purple',
          },
        },
      },
    },

    /**
     * 按钮组件样式
     * 定义多个按钮变体：
     * - solid: 实心主要按钮
     * - solidSecondary: 实心次要按钮
     * - outline: 描边主要按钮
     * - outlineSecondary: 描边次要按钮
     * - ghost: 幽灵按钮
     */
    Button: {
      baseStyle: {
        bg: 'brand.purple',
        _hover: {
          bg: 'white',
        },
        rounded: 'md',
        color: 'white',
      },
      variants: {
        // 实心主要按钮
        solid: {
          color: 'white',
          bg: 'brand.purple',
          _hover: {
            color: 'white',
            bg: 'brand.purple.light',
          },
          _disabled: {
            _hover: {
              color: 'white',
              bg: 'brand.purple !important',
            },
          },
        },
        // 实心次要按钮
        solidSecondary: {
          color: 'brand.purple.dark',
          bg: 'brand.purple.50',
          _hover: {
            color: 'white',
            bg: 'brand.purple',
          },
          _disabled: {
            _hover: {
              color: 'white',
              bg: 'brand.purple.50 !important',
            },
          },
        },
        // 描边主要按钮
        outline: {
          color: 'brand.purple',
          bg: 'transparent',
          borderColor: 'brand.purple',
          _hover: {
            color: 'white',
            bg: 'brand.purple',
          },
          _disabled: {
            _hover: {
              color: 'brand.purple',
              bg: 'transparent !important',
              borderColor: 'brand.purple',
            },
          },
        },
        // 描边次要按钮
        outlineSecondary: {
          color: 'brand.slate.400',
          bg: 'transparent',
          border: '1px solid',
          borderColor: 'brand.slate.400',
          _hover: {
            color: 'white',
            bg: 'brand.slate.400',
          },
          _disabled: {
            _hover: {
              color: 'brand.slate.400',
              bg: 'transparent !important',
              borderColor: 'brand.slate.400',
            },
          },
        },
        // 幽灵按钮
        ghost: {
          color: 'brand.slate.500',
          bg: 'transparent',
          _hover: {
            color: 'white',
            bg: 'brand.purple',
          },
          _disabled: {
            _hover: {
              color: 'brand.slate.500',
              bg: 'transparent !important',
            },
          },
        },
      },
    },

    /**
     * 进度条组件样式
     * 自定义填充轨道颜色
     */
    Progress: {
      baseStyle: {
        filledTrack: {
          bg: 'brand.purple',
        },
      },
    },
  },
});

export default theme;
