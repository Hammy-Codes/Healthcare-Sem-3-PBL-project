#ifndef CB_LINKED_LIST_H
#define CB_LINKED_LIST_H
#include <stddef.h>
#ifdef __cplusplus
extern "C" {
#endif
typedef struct CBListNode { int value; struct CBListNode *next; } CBListNode;
int cb_list_insert(CBListNode **head, int value);
int cb_list_delete(CBListNode **head, int value);
CBListNode *cb_list_search(CBListNode *head, int value);
size_t cb_list_traverse(const CBListNode *head, int *out, size_t capacity);
void cb_list_free(CBListNode **head);
#ifdef __cplusplus
}
#endif
#endif
