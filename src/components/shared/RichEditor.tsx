// 导入必要的UI组件和图标
import { ChevronRightIcon } from '@chakra-ui/icons';
import { Box, HStack, IconButton, Input } from '@chakra-ui/react';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { type Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BiBold,
  BiItalic,
  BiLink,
  BiLinkExternal,
  BiTrashAlt,
} from 'react-icons/bi';
import { FaListOl, FaListUl } from 'react-icons/fa6';

// 定义富文本编辑器的Props接口
interface RichEditorProps {
  id: string;                              // 编辑器唯一标识
  value: string;                           // 编辑器内容
  onChange: (value: string) => void;       // 内容变化回调函数
  height?: string;                         // 编辑器高度
  placeholder?: string;                    // 占位符文本
  isError?: boolean;                       // 是否显示错误状态
  maxHeight?: string;                      // 最大高度
}

// 富文本编辑器组件
export const RichEditor: React.FC<RichEditorProps> = ({
  id,
  value,
  onChange,
  height = '10rem',
  maxHeight = '10rem',
  placeholder = '',
  isError = false,
}) => {
  // 编辑器DOM引用
  const editorRef = useRef<HTMLDivElement>(null);
  
  // 初始化TipTap编辑器
  const editor = useEditor({
    extensions: [
      StarterKit,                          // 基础功能集
      TaskList,                            // 任务列表功能
      TaskItem,                            // 任务项功能
      Placeholder.configure({              // 占位符配置
        placeholder,
      }),
      Link.configure({                     // 链接配置
        openOnClick: false,
      }),
    ],
    content: value || undefined,           // 初始内容
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
    // 内容更新时的回调
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // 当外部value属性变化时更新编辑器内容
  useEffect(() => {
    if (editor && value && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <Box pos="relative" w="full">
      {/* 浮动工具栏 */}
      <FloatingToolbar editor={editor} editorClassname={`editor-${id}`} />
      {/* 编辑器容器 */}
      <Box
        className={`editor-${id}`}
        ref={editorRef}
        sx={{
          // 占位符样式
          '.ProseMirror p.is-editor-empty:first-child::before': {
            color: 'var(--chakra-colors-gray-300)',
            content: 'attr(data-placeholder)',
            float: 'left',
            height: 0,
            pointerEvents: 'none',
          },
        }}
        overflowY="auto"
        w="full"
        h={height}
        maxH={maxHeight}
        py={2}
        borderWidth={isError ? '2px' : '1px'}
        borderColor={isError ? 'red.500' : 'brand.slate.300'}
        _focusWithin={{
          borderColor: 'brand.purple',
          borderWidth: '2px',
        }}
        id="reset-des"
        rounded="lg"
      >
        {/* TipTap编辑器内容 */}
        <EditorContent
          editor={editor}
          style={{
            height: '87%',
            marginTop: '0px !important',
          }}
        />
      </Box>
    </Box>
  );
};

// 浮动工具栏Props接口
interface FloatingToolbarProps {
  editor: Editor;                // 编辑器实例
  editorClassname: string;      // 编辑器容器的类名
}

// 浮动工具栏组件
const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  editor,
  editorClassname: editorClassname,
}) => {
  // 工具栏位置和样式状态
  const [style, setStyle] = useState({ top: 0, left: 0, opacity: 0 });
  // 工具栏当前状态（默认/链接/隐藏）
  const [toolbarState, setToolbarState] = useState<
    'default' | 'link' | 'hidden'
  >('hidden');
  // 链接URL输入状态
  const [linkUrl, setLinkUrl] = useState('');
  // 工具栏DOM引用
  const toolbarRef = useRef<HTMLDivElement>(null);

  // 监听编辑器事件和处理工具栏位置更新
  useEffect(() => {
    if (!editor) return;
    const editorElement =
      document.getElementsByClassName(editorClassname)[0] || undefined;
    if (!editorElement) return;

    // 处理选区变化
    const handleSelectionChange = () => {
      setTimeout(updateToolbarPosition, 0);
    };

    // 处理点击工具栏外部
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(event.target as Node)
      ) {
        setToolbarState('hidden');
      }
    };

    // 处理ESC键
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setToolbarState('hidden');
      }
    };

    // 添加事件监听器
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    window.addEventListener('resize', updateToolbarPosition);
    editorElement?.addEventListener('scroll', updateToolbarPosition);
    editor.on('selectionUpdate', updateToolbarPosition);
    editor.on('transaction', updateToolbarPosition);

    // 清理事件监听器
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      window.removeEventListener('resize', updateToolbarPosition);
      editorElement?.removeEventListener('scroll', updateToolbarPosition);
      editor.off('selectionUpdate', updateToolbarPosition);
      editor.off('transaction', updateToolbarPosition);
    };
  }, [updateToolbarPosition, editor]);

  // 定义工具栏按钮
  const toolbarButtons = useMemo(
    () => [
      {
        ariaLabel: 'Bold',                 // 粗体按钮
        icon: <BiBold />,
        isActive: () => editor.isActive('bold'),
        action: () => editor.chain().focus().toggleBold().run(),
      },
      {
        ariaLabel: 'Italic',               // 斜体按钮
        icon: <BiItalic />,
        isActive: () => editor.isActive('italic'),
        action: () => editor.chain().focus().toggleItalic().run(),
      },
      {
        ariaLabel: 'Ordered List',         // 有序列表按钮
        icon: <FaListOl />,
        isActive: () => editor.isActive('orderedList'),
        action: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        ariaLabel: 'Unordered List',       // 无序列表按钮
        icon: <FaListUl />,
        isActive: () => editor.isActive('bulletList'),
        action: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        ariaLabel: 'Insert Link',          // 插入链接按钮
        icon: <BiLink />,
        isActive: () => editor.isActive('link'),
        action: () => {
          setToolbarState('link');
          let { href } = editor.getAttributes('link');
          if (!href) return setLinkUrl('');
          if (!href?.startsWith('http://') && !href?.startsWith('https://')) {
            href = 'https://' + href;
          }
          setLinkUrl(href || '');
        },
      },
    ],
    [editor],
  );

  // 默认工具栏组件
  const DefaultToolbar = useCallback(
    () => (
      <>
        {toolbarButtons.map((button, index) => (
          <IconButton
            key={index}
            h="full"
            color={button.isActive() ? 'brand.slate.900' : 'brand.slate.500'}
            bg={button.isActive() ? 'brand.slate.200' : 'white'}
            borderLeftWidth={index === 0 ? 0 : 1}
            borderLeftColor="brand.slate.300"
            borderRadius={0}
            aria-label={button.ariaLabel}
            icon={button.icon}
            onClick={button.action}
            size="sm"
          />
        ))}
      </>
    ),
    [toolbarButtons],
  );

  // 添加链接到编辑器
  function addLinkToEditor() {
    if (linkUrl) {
      let href = linkUrl;
      if (!href) return setLinkUrl('');
      // 确保链接以http://或https://开头
      if (!href?.startsWith('http://') && !href?.startsWith('https://')) {
        href = 'https://' + href;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
  }

  // 链接工具栏组件
  const LinkToolbar = useCallback(() => {
    return (
      <>
        {/* 链接输入框 */}
        <Input
          w="full"
          h="full"
          fontSize={'sm'}
          border={'none'}
          _focusVisible={{ outline: 'none', border: 'none' }}
          _placeholder={{
            color: 'brand.slate.300',
          }}
          outline={'none'}
          autoFocus
          onChange={(e) => setLinkUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addLinkToEditor();
              setToolbarState('default');
              setLinkUrl('');
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setToolbarState('default');
              setLinkUrl('');
            }
          }}
          placeholder="https://..."
          size="sm"
          value={linkUrl}
        />
        {/* 打开链接按钮 */}
        {!!linkUrl && (
          <IconButton
            h="full"
            color={'brand.slate.500'}
            bg={'white'}
            borderLeftWidth={1}
            borderLeftColor="brand.slate.300"
            borderRadius={0}
            aria-label="Open Link"
            icon={<BiLinkExternal />}
            onClick={() => {
              const { href } = editor.getAttributes('link');
              if (href) {
                window.open(href, '_blank');
              }
            }}
            size="sm"
          />
        )}
        {/* 删除链接按钮 */}
        <IconButton
          h="full"
          color={'brand.slate.500'}
          bg={'white'}
          borderLeftWidth={1}
          borderLeftColor="brand.slate.300"
          borderRadius={0}
          aria-label="Remove Link"
          icon={<BiTrashAlt />}
          onClick={() => {
            editor.chain().focus().unsetLink().run();
            setToolbarState('default');
          }}
          size="sm"
        />
        {/* 移动端确认按钮 */}
        <IconButton
          display={{ base: 'block', lg: 'none' }}
          h="full"
          color={'brand.slate.500'}
          bg={'white'}
          borderLeftWidth={1}
          borderLeftColor="brand.slate.300"
          borderRadius={0}
          aria-label="Open Link"
          icon={<ChevronRightIcon w={5} h={5} />}
          onClick={() => {
            addLinkToEditor();
          }}
          size="sm"
        />
      </>
    );
  }, [editor, linkUrl]);

  // 如果编辑器未初始化或工具栏隐藏，不渲染任何内容
  if (!editor || toolbarState === 'hidden') {
    return null;
  }

  // 渲染工具栏
  return (
    <Box
      pos="absolute"
      zIndex={1000}
      pointerEvents={style.opacity === 0 ? 'none' : 'auto'}
      style={{
        top: `${style.top}px`,
        left: `${style.left}px`,
        opacity: style.opacity,
        transition: 'opacity 0.2s',
      }}
    >
      {/* 工具栏容器 */}
      <HStack
        gap={0}
        overflow="hidden"
        h={8}
        color="brand.slate.500"
        bg="white"
        borderWidth={1}
        borderColor="brand.slate.300"
        borderRadius="md"
        shadow="md"
      >
        {/* 根据工具栏状态显示不同内容 */}
        {toolbarState === 'default' && <DefaultToolbar />}
        {toolbarState === 'link' && <LinkToolbar />}
      </HStack>
    </Box>
  );
};
