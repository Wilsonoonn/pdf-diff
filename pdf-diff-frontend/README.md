# PDF 差异对比工具

这是一个基于 React 和 TypeScript 开发的 PDF 差异对比工具，可以帮助用户快速识别和查看两个 PDF 文件之间的差异。

## 功能特性

### 核心功能

- **PDF 文件上传**: 支持上传两个 PDF 文件进行对比
- **差异检测**: 自动检测文本的增删改差异
- **可视化展示**: 在 PDF 页面上高亮显示差异位置
- **同步滚动**: 两个 PDF 文件支持同步滚动，便于对比查看

### 差异列表功能

- **差异列表侧边栏**: 右上角按钮可以打开/关闭差异列表
- **差异分类**: 支持显示文本修改、添加、删除三种类型的差异
- **快速跳转**: 点击差异列表中的任意项目，可以快速跳转到对应的 PDF 位置
- **智能缩放**: 当差异列表打开时，PDF 视图会自动调整大小以适应布局
- **高亮显示**: 当前选中的差异会在列表中高亮显示

### 交互功能

- **颜色自定义**: 支持自定义差异高亮颜色
- **页面信息**: 显示当前查看的页面信息
- **响应式设计**: 支持不同屏幕尺寸的适配

## 使用方法

### 基本操作

1. 点击"选择文件"按钮上传第一个 PDF 文件
2. 点击"选择文件"按钮上传第二个 PDF 文件
3. 点击"Compare"按钮开始对比分析
4. 等待分析完成后，差异位置会在 PDF 中高亮显示

### 差异列表使用

1. 点击右上角的"Show Differences"按钮打开差异列表
2. 在差异列表中可以看到所有检测到的差异
3. 点击任意差异项目，PDF 会自动跳转到对应位置
4. 点击"Hide Differences"按钮可以关闭差异列表

### 自定义设置

- 使用颜色选择器可以更改差异高亮颜色
- 差异列表支持滚动查看所有差异项目

## 技术架构

### 前端技术栈

- **React 18**: 用户界面框架
- **TypeScript**: 类型安全的 JavaScript
- **PDF.js**: PDF 文件渲染和操作
- **Axios**: HTTP 请求处理

### 后端 API

- 支持 POST 请求到`http://localhost:8000/compare`进行 PDF 对比
- 接收 multipart/form-data 格式的文件上传
- 返回 JSON 格式的差异数据

### 数据结构

```typescript
interface Difference {
  page_index: number; // 差异所在页面索引
  type: "modification" | "addition" | "deletion"; // 差异类型
  bbox_a: number[] | null; // 文件A中的边界框坐标
  bbox_b: number[] | null; // 文件B中的边界框坐标
  text_a: string | null; // 文件A中的原始文本
  text_b: string | null; // 文件B中的修改后文本
  absolute_y_a: number | null; // 文件A中的绝对Y坐标
  absolute_y_b: number | null; // 文件B中的绝对Y坐标
}
```

## 开发环境设置

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```

### 构建生产版本

```bash
npm run build
```

### 运行测试

```bash
npm test
```

## 项目结构

```
src/
├── components/          # React组件
│   ├── DiffSidebar.tsx    # 差异列表侧边栏组件
│   ├── DiffSidebar.css    # 差异列表样式
│   ├── PdfViewer.tsx      # PDF查看器组件
│   └── ...
├── types.ts            # TypeScript类型定义
├── App.tsx             # 主应用组件
└── App.css             # 主应用样式
```

## 更新日志

### v1.0.0

- 实现基本的 PDF 差异对比功能
- 添加差异列表侧边栏
- 支持差异位置快速跳转
- 实现同步滚动功能
- 添加颜色自定义功能

## 注意事项

1. 确保后端 API 服务在`http://localhost:8000`运行
2. 上传的 PDF 文件应该是可读的文本 PDF，图片 PDF 可能无法正确检测差异
3. 大文件处理可能需要较长时间，请耐心等待
4. 建议使用现代浏览器以获得最佳体验

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个项目。在提交代码前，请确保：

1. 代码符合项目的编码规范
2. 新功能包含适当的测试
3. 更新相关文档

## 许可证

MIT License
