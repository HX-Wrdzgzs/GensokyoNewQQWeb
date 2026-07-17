# API、CQ 码与扩展能力矩阵

本页汇总 Gensokyo-NewQQ 主仓库文档中列出的 OneBot V11 API、项目扩展 API 和 CQ 码，便于部署者与插件开发者快速检索。

矩阵中的状态含义：

- **已映射**：主仓库明确列出，并提供对应的 OneBot 调用或消息映射。
- **适配实现**：提供相应入口，但返回字段、权限或行为会受到 QQ 官方机器人能力限制。
- **项目扩展**：不属于标准 OneBot V11，由 Gensokyo-NewQQ 额外提供。

> [!IMPORTANT]
> 本页不是稳定 ABI 承诺。QQ 官方平台权限、项目实现和版本差异都可能影响实际结果。开发插件前，应在目标版本上进行真实调用测试，并结合主仓库源码与运行日志确认。

<script setup>
import ApiMatrix from '../components/ApiMatrix.vue'
</script>

<ApiMatrix />
