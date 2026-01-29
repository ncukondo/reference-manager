spec/_index.mdを起点として必要事項を確認後、spec/tasks/内のタスク[prefix]-*$ARGUMENTS*.mdに取り組んで下さい。

作業は git worktree内(無ければ作成, ブランチ名も適切なものを考える, ブランチの作成は直接行わずgit worktree addの中で行う)で行います。git worktree作成時は、npm installを実行して下さい。

Todos一つが完了する毎にタスクファイルを更新し、commitします。

次のタスクに移る前に、残りのcontextを確認し、次の作業の完了までにcompactが必要になってしまいそうならその時点で作業を中断して下さい